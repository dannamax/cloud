import express from 'express';
import { getDatabase } from '../database.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const router = express.Router();

// 获取所有服务器
router.get('/', (req, res) => {
  const db = getDatabase();
  const { environment, status, role, cabinet, keyword } = req.query;
  
  let sql = 'SELECT * FROM servers WHERE 1=1';
  const params: any[] = [];
  
  if (environment) {
    sql += ' AND environment = ?';
    params.push(environment);
  }
  if (status) {
    // status 参数可能是 'online', 'offline' (online_status) 或 '已上架'/'异动中' (status)
    if (status === 'online' || status === 'offline') {
      sql += ' AND online_status = ?';
    } else {
      sql += ' AND status = ?';
    }
    params.push(status);
  }
  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }
  if (cabinet) {
    sql += ' AND cabinet LIKE ?';
    params.push(`%${cabinet}%`);
  }
  if (keyword) {
    sql += ' AND (system_ip LIKE ? OR sn LIKE ? OR name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  
  sql += ' ORDER BY id DESC';
  
  const servers = db.prepare(sql).all(...params);
  res.json(servers);
});

// 获取服务器统计
router.get('/stats', (req, res) => {
  const db = getDatabase();
  
  const total = db.prepare('SELECT COUNT(*) as count FROM servers').get() as any;
  const online = db.prepare("SELECT COUNT(*) as count FROM servers WHERE online_status = 'online'").get() as any;
  const offline = db.prepare("SELECT COUNT(*) as count FROM servers WHERE online_status = 'offline'").get() as any;
  const inTransit = db.prepare("SELECT COUNT(*) as count FROM servers WHERE status = '异动中'").get() as any;
  
  const byEnvironment = db.prepare(`
    SELECT environment, COUNT(*) as count 
    FROM servers 
    WHERE environment IS NOT NULL AND environment != ''
    GROUP BY environment
  `).all();
  
  const byRole = db.prepare(`
    SELECT role, COUNT(*) as count 
    FROM servers 
    WHERE role IS NOT NULL AND role != ''
    GROUP BY role
  `).all();
  
  const byCabinet = db.prepare(`
    SELECT cabinet, COUNT(*) as count 
    FROM servers 
    WHERE cabinet IS NOT NULL AND cabinet != ''
    GROUP BY cabinet
    ORDER BY count DESC
    LIMIT 20
  `).all();

  const byRoleAndModel = db.prepare(`
    SELECT
      COALESCE(NULLIF(role, ''), '未分配') as role,
      COALESCE(NULLIF(role_type, ''), 'other') as role_type,
      COALESCE(CONCAT(brand, ' ', model), '未知') as model_name,
      COUNT(*) as count
    FROM servers
    GROUP BY role, role_type, model_name
    ORDER BY role, count DESC
  `).all();

  // 获取按角色类型分组的角色
  const byRoleType = db.prepare(`
    SELECT
      COALESCE(role_type, 'other') as role_type,
      role,
      COUNT(*) as count
    FROM servers
    WHERE role IS NOT NULL AND role != ''
    GROUP BY role_type, role
    ORDER BY role_type, count DESC
  `).all();

  // 获取所有角色类型
  const roleTypes = db.prepare('SELECT * FROM role_types ORDER BY sort_order ASC').all();

  const allServers = db.prepare('SELECT * FROM servers').all();

  res.json({
    total: total.count,
    online: online.count,
    offline: offline.count,
    inTransit: inTransit.count,
    byEnvironment,
    byRole,
    byCabinet,
    byRoleAndModel,
    byRoleType,
    roleTypes,
    allServers,
  });
});

// 获取单个服务器
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  
  if (!server) {
    return res.status(404).json({ error: '服务器不存在' });
  }
  
  res.json(server);
});

// 创建服务器
router.post('/', (req, res) => {
  const db = getDatabase();
  const {
    name, environment, system_ip, manage_ip, oob_ip, mac_address,
    cabinet, u_position, u_height, sn, brand, model, cpu, memory, disk, network_card,
    role, role_type, tags, status, remark
  } = req.body;

  const result = db.prepare(`
    INSERT INTO servers (name, environment, system_ip, manage_ip, oob_ip, mac_address,
      cabinet, u_position, u_height, sn, brand, model, cpu, memory, disk, network_card, role, role_type, tags, status, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, environment, system_ip, manage_ip, oob_ip, mac_address,
    cabinet, u_position || 0, u_height || 2, sn, brand, model, cpu, memory, disk, network_card,
    role, role_type, tags, status || '待上架', remark
  );

  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(result.lastInsertRowid);

  res.json(server);
});

// 更新服务器
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { id, ...updates } = req.body;

  const existing = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    return res.status(404).json({ error: '服务器不存在' });
  }

  // 构建动态更新语句，只更新提供的字段
  const allowedFields = [
    'name', 'environment', 'system_ip', 'manage_ip', 'oob_ip', 'mac_address',
    'cabinet', 'u_position', 'u_height', 'sn', 'brand', 'model', 'cpu', 'memory',
    'disk', 'network_card', 'role', 'role_type', 'tags', 'status', 'remark'
  ];

  const setClauses: string[] = [];
  const values: any[] = [];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      setClauses.push(`${field} = ?`);
      // 处理 u_position 和 u_height 的默认值
      if (field === 'u_position') {
        values.push(updates[field] ?? 0);
      } else if (field === 'u_height') {
        values.push(updates[field] ?? 2);
      } else {
        values.push(updates[field]);
      }
    }
  }

  if (setClauses.length === 0) {
    return res.json(existing);
  }

  setClauses.push("updated_at = datetime('now')");
  values.push(req.params.id);

  db.prepare(`UPDATE servers SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);

  res.json(server);
});

// 删除服务器
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const serverId = req.params.id;
  
  // 使用事务删除，先删关联数据
  const deleteTransaction = db.transaction(() => {
    db.prepare('DELETE FROM change_logs WHERE server_id = ?').run(serverId);
    db.prepare('DELETE FROM servers WHERE id = ?').run(serverId);
  });
  
  try {
    deleteTransaction();
    res.json({ success: true });
  } catch (error) {
    console.error('[服务器] 删除失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 批量删除服务器
router.post('/batch/delete', (req, res) => {
  const db = getDatabase();
  const { ids } = req.body;
  
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: '请选择要删除的服务器' });
  }
  
  const placeholders = ids.map(() => '?').join(',');
  
  // 使用事务删除，先删关联数据
  const deleteTransaction = db.transaction(() => {
    db.prepare(`DELETE FROM change_logs WHERE server_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM servers WHERE id IN (${placeholders})`).run(...ids);
  });
  
  try {
    deleteTransaction();
    res.json({ 
      success: true, 
      deleted: ids.length,
      message: `成功删除 ${ids.length} 台服务器`
    });
  } catch (error) {
    console.error('[服务器] 批量删除失败:', error);
    res.status(500).json({ success: false, message: '批量删除失败' });
  }
});

// 标记异动
router.post('/:id/change', (req, res) => {
  const db = getDatabase();
  const { change_type, after_status, operator, remark } = req.body;
  
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id) as any;
  if (!server) {
    return res.status(404).json({ error: '服务器不存在' });
  }
  
  // 更新服务器状态
  db.prepare(`
    UPDATE servers SET status = ?, updated_at = datetime('now') WHERE id = ?
  `).run(after_status, req.params.id);
  
  // 记录变更日志
  db.prepare(`
    INSERT INTO change_logs (server_id, server_name, change_type, before_status, after_status, operator, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, server.name, change_type, server.status, after_status, operator || 'system', remark);
  
  const updatedServer = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  res.json(updatedServer);
});

// 批量更新服务器状态
router.post('/batch/status', (req, res) => {
  const db = getDatabase();
  const { ids, status } = req.body;
  
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: '无效的ID列表' });
  }
  
  const updateMany = db.transaction((serverIds: number[]) => {
    for (const id of serverIds) {
      const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(id) as any;
      if (server) {
        db.prepare('UPDATE servers SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, id);
        db.prepare(`
          INSERT INTO change_logs (server_id, server_name, change_type, before_status, after_status, operator, remark)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, server.name, '批量更新', server.status, status, 'system', '批量操作');
      }
    }
  });
  
  updateMany(ids);
  res.json({ success: true });
});

// 批量SSH端口探测（支持环境过滤，高并发）- 必须放在 /:id/port-check 之前
router.post('/batch/port-check', async (req, res) => {
  const db = getDatabase();
  const { environment } = req.body;
  
  // 根据环境查询服务器
  let query = 'SELECT id, system_ip, manage_ip FROM servers WHERE (system_ip IS NOT NULL AND system_ip != \'\') OR (manage_ip IS NOT NULL AND manage_ip != \'\')';
  const params: any[] = [];
  
  if (environment && environment.trim()) {
    query += ' AND environment = ?';
    params.push(environment.trim());
  }
  
  const servers = db.prepare(query).all(...params) as any[];
  
  if (servers.length === 0) {
    return res.json({ success: true, results: [], total: 0, online: 0, offline: 0 });
  }
  
  // 立即返回，后台执行检测
  res.json({ 
    success: true, 
    results: [],
    total: servers.length,
    message: '检测已开始，后台处理中...'
  });
  
  const timeout = 1;
  const port = 22;
  const isWindows = process.platform === 'win32';
  
  // 后台执行端口检测
  const checkServer = async (server: any) => {
    const ip = server.system_ip || server.manage_ip;
    if (!ip) return;
    
    try {
      let cmd: string;
      if (isWindows) {
        cmd = `powershell -Command "Test-NetConnection -ComputerName ${ip} -Port ${port} -WarningAction SilentlyContinue | Select-Object -ExpandProperty TcpTestSucceeded"`;
      } else {
        cmd = `nc -z -w ${timeout} ${ip} ${port}`;
      }
      await execAsync(cmd);
      db.prepare('UPDATE servers SET online_status = ?, last_heartbeat = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?')
        .run('online', server.id);
    } catch (error) {
      db.prepare('UPDATE servers SET online_status = ?, last_heartbeat = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?')
        .run('offline', server.id);
    }
  };
  
  // 高并发检测（100并发）
  const concurrency = 100;
  for (let i = 0; i < servers.length; i += concurrency) {
    const batch = servers.slice(i, i + concurrency);
    Promise.all(batch.map(checkServer)).catch(() => {});
  }
});

export default router;
