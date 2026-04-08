import { Router } from 'express';
import { getDatabase } from '../database.js';

const router = Router();

/**
 * 获取下一个版本号
 */
function getNextVersionNumber(): number {
  const db = getDatabase();
  const result = db.prepare('SELECT MAX(version_number) as max_version FROM data_versions').get() as { max_version: number | null };
  return (result.max_version || 0) + 1;
}

/**
 * 创建数据快照
 * @param dataType 数据类型 (servers, cabinets, environments, tags, all)
 * @param description 版本描述
 * @param operator 操作人
 */
export function createSnapshot(dataType: string, description?: string, operator?: string) {
  const db = getDatabase();
  const versionNumber = getNextVersionNumber();
  const now = new Date().toISOString();

  let snapshotData: Record<string, any> = {};

  if (dataType === 'all' || dataType === 'servers') {
    const servers = db.prepare('SELECT * FROM servers').all();
    snapshotData.servers = servers;
  }
  if (dataType === 'all' || dataType === 'cabinets') {
    const cabinets = db.prepare('SELECT * FROM cabinets').all();
    snapshotData.cabinets = cabinets;
  }
  if (dataType === 'all' || dataType === 'environments') {
    const environments = db.prepare('SELECT * FROM environments').all();
    snapshotData.environments = environments;
  }
  if (dataType === 'all' || dataType === 'tags') {
    const tags = db.prepare('SELECT * FROM tags').all();
    snapshotData.tags = tags;
  }

  db.prepare(`
    INSERT INTO data_versions (version_number, data_type, snapshot_data, description, operator, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(versionNumber, dataType, JSON.stringify(snapshotData), description || '自动快照', operator || 'system', now);

  return { versionNumber, snapshotData };
}

// ==================== API 接口 ====================

// 获取版本列表
router.get('/versions', (req, res) => {
  try {
    const db = getDatabase();
    const { data_type, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM data_versions';
    const params: any[] = [];

    if (data_type) {
      query += ' WHERE data_type = ?';
      params.push(data_type);
    }

    query += ' ORDER BY version_number DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const versions = db.prepare(query).all(...params);

    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM data_versions';
    if (data_type) {
      countQuery += ' WHERE data_type = ?';
    }
    const total = db.prepare(countQuery).get(...(data_type ? [data_type] : [])) as { total: number };

    res.json({
      success: true,
      data: versions,
      total: total.total
    });
  } catch (error) {
    console.error('[版本管理] 获取版本列表失败:', error);
    res.status(500).json({ success: false, message: '获取版本列表失败' });
  }
});

// 获取最新版本号
router.get('/versions/latest', (req, res) => {
  try {
    const db = getDatabase();
    const latest = db.prepare('SELECT MAX(version_number) as latest FROM data_versions').get() as { latest: number | null };
    res.json({ success: true, latestVersion: latest.latest || 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取最新版本失败' });
  }
});

// 获取指定版本详情
router.get('/versions/:versionNumber', (req, res) => {
  try {
    const db = getDatabase();
    const { versionNumber } = req.params;

    const version = db.prepare('SELECT * FROM data_versions WHERE version_number = ?').get(versionNumber);

    if (!version) {
      return res.status(404).json({ success: false, message: '版本不存在' });
    }

    const versionData = version as any;
    res.json({
      success: true,
      data: version
    });
  } catch (error) {
    console.error('[版本管理] 获取版本详情失败:', error);
    res.status(500).json({ success: false, message: '获取版本详情失败' });
  }
});

// 创建手动快照
router.post('/versions/snapshot', (req, res) => {
  try {
    const { data_type = 'all', description } = req.body;
    const operator = req.body.operator || req.headers['x-username'] as string || 'system';

    const result = createSnapshot(data_type, description, operator);

    res.json({
      success: true,
      message: `快照创建成功，版本号: ${result.versionNumber}`,
      versionNumber: result.versionNumber
    });
  } catch (error) {
    console.error('[版本管理] 创建快照失败:', error);
    res.status(500).json({ success: false, message: '创建快照失败' });
  }
});

// 回退到指定版本
router.post('/versions/:versionNumber/rollback', (req, res) => {
  try {
    const db = getDatabase();
    const { versionNumber } = req.params;
    const operator = req.body.operator || req.headers['x-username'] as string || 'system';

    // 获取目标版本
    const targetVersion = db.prepare('SELECT * FROM data_versions WHERE version_number = ?').get(versionNumber) as any;

    if (!targetVersion) {
      return res.status(404).json({ success: false, message: '版本不存在' });
    }

    // 解析快照数据
    const snapshotData = JSON.parse(targetVersion.snapshot_data);

    // 回退前先创建当前状态的快照
    createSnapshot('all', `回退前自动备份 (回退到v${versionNumber})`, operator);

    // 执行回退
    const rollbackTransaction = db.transaction(() => {
      // 回退 servers
      if (snapshotData.servers) {
        // 清空并重建
        db.prepare('DELETE FROM servers').run();
        const insertServer = db.prepare(`
          INSERT INTO servers (id, name, environment, system_ip, manage_ip, oob_ip, mac_address, 
            cabinet, u_position, u_height, sn, brand, model, cpu, memory, disk, network_card, 
            role, tags, status, online_status, last_heartbeat, remark, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const server of snapshotData.servers) {
          insertServer.run(
            server.id, server.name, server.environment, server.system_ip, server.manage_ip,
            server.oob_ip, server.mac_address, server.cabinet, server.u_position, server.u_height,
            server.sn, server.brand, server.model, server.cpu, server.memory, server.disk,
            server.network_card, server.role, server.tags, server.status, server.online_status,
            server.last_heartbeat, server.remark, server.created_at, server.updated_at
          );
        }
      }

      // 回退 cabinets
      if (snapshotData.cabinets) {
        db.prepare('DELETE FROM cabinets').run();
        const insertCabinet = db.prepare(`
          INSERT INTO cabinets (id, name, environment, total_u, reserved_u, remark, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const cabinet of snapshotData.cabinets) {
          insertCabinet.run(
            cabinet.id, cabinet.name, cabinet.environment, cabinet.total_u,
            cabinet.reserved_u, cabinet.remark, cabinet.created_at, cabinet.updated_at
          );
        }
      }

      // 回退 environments
      if (snapshotData.environments) {
        db.prepare('DELETE FROM environments').run();
        const insertEnv = db.prepare(`
          INSERT INTO environments (id, name, code, description, sort_order, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const env of snapshotData.environments) {
          insertEnv.run(
            env.id, env.name, env.code, env.description, env.sort_order,
            env.status, env.created_at, env.updated_at
          );
        }
      }

      // 回退 tags
      if (snapshotData.tags) {
        db.prepare('DELETE FROM tags').run();
        const insertTag = db.prepare(`
          INSERT INTO tags (id, name, color, description, created_at)
          VALUES (?, ?, ?, ?, ?)
        `);

        for (const tag of snapshotData.tags) {
          insertTag.run(tag.id, tag.name, tag.color, tag.description, tag.created_at);
        }
      }
    });

    rollbackTransaction();

    // 记录操作日志
    db.prepare(`
      INSERT INTO operation_logs (user_id, username, action, target, target_type, detail, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(null, operator, '版本回退', `v${versionNumber}`, '系统', `回退到版本 v${versionNumber}，描述: ${targetVersion.description || '无'}`, req.ip);

    res.json({
      success: true,
      message: `成功回退到版本 v${versionNumber}`,
      restoredData: {
        servers: snapshotData.servers?.length || 0,
        cabinets: snapshotData.cabinets?.length || 0,
        environments: snapshotData.environments?.length || 0,
        tags: snapshotData.tags?.length || 0
      }
    });
  } catch (error: any) {
    console.error('[版本管理] 回退版本失败:', error);
    const errorMessage = error?.message || '回退版本失败';
    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      detail: error?.stack || String(error)
    });
  }
});

// 比较两个版本差异
router.get('/versions/compare', (req, res) => {
  try {
    const db = getDatabase();
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ success: false, message: '需要指定 from 和 to 版本号' });
    }

    const versionFrom = db.prepare('SELECT * FROM data_versions WHERE version_number = ?').get(from) as any;
    const versionTo = db.prepare('SELECT * FROM data_versions WHERE version_number = ?').get(to) as any;

    if (!versionFrom || !versionTo) {
      return res.status(404).json({ success: false, message: '版本不存在' });
    }

    const dataFrom = JSON.parse(versionFrom.snapshot_data);
    const dataTo = JSON.parse(versionTo.snapshot_data);

    const diff: Record<string, any> = {};

    // 比较 servers
    if (dataFrom.servers && dataTo.servers) {
      const fromIds = new Set(dataFrom.servers.map((s: any) => s.id));
      const toIds = new Set(dataTo.servers.map((s: any) => s.id));

      diff.servers = {
        added: dataTo.servers.filter((s: any) => !fromIds.has(s.id)),
        removed: dataFrom.servers.filter((s: any) => !toIds.has(s.id)),
        modified: dataTo.servers.filter((s: any) => {
          const fromServer = dataFrom.servers.find((f: any) => f.id === s.id);
          if (!fromServer) return false;
          return JSON.stringify(fromServer) !== JSON.stringify(s);
        })
      };
    }

    res.json({
      success: true,
      from: { version: versionFrom.version_number, description: versionFrom.description },
      to: { version: versionTo.version_number, description: versionTo.description },
      diff
    });
  } catch (error) {
    console.error('[版本管理] 比较版本失败:', error);
    res.status(500).json({ success: false, message: '比较版本失败' });
  }
});

export default router;
