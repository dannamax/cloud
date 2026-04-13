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
    sql += ' AND status = ?';
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
  
  res.json({
    total: total.count,
    online: online.count,
    offline: offline.count,
    inTransit: inTransit.count,
    byEnvironment,
    byRole,
    byCabinet,
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
    role, tags, status, remark
  } = req.body;
  
  const result = db.prepare(`
    INSERT INTO servers (name, environment, system_ip, manage_ip, oob_ip, mac_address,
      cabinet, u_position, u_height, sn, brand, model, cpu, memory, disk, network_card, role, tags, status, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, environment, system_ip, manage_ip, oob_ip, mac_address,
    cabinet, u_position || 0, u_height || 2, sn, brand, model, cpu, memory, disk, network_card,
    role, tags, status || '待上架', remark
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
    'disk', 'network_card', 'role', 'tags', 'status', 'remark'
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

// Ping检测服务器
router.post('/:id/ping', async (req, res) => {
  const db = getDatabase();
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id) as any;
  
  if (!server) {
    return res.status(404).json({ error: '服务器不存在' });
  }
  
  const ip = server.system_ip || server.manage_ip;
  if (!ip) {
    return res.status(400).json({ error: '服务器没有IP地址' });
  }
  
  try {
    // 执行ping命令 (Linux/Mac使用-c 1 Windows使用-n 1)
    const isWindows = process.platform === 'win32';
    const cmd = isWindows ? `ping -n 1 -w 1000 ${ip}` : `ping -c 1 -W 1 ${ip}`;
    const { stdout } = await execAsync(cmd);
    
    // 判断是否ping通
    const isReachable = isWindows 
      ? stdout.toLowerCase().includes('ttl=') || stdout.toLowerCase().includes('ttl=')
      : stdout.toLowerCase().includes('ttl=');
    
    const newStatus = isReachable ? 'online' : 'offline';
    
    // 更新数据库中的online_status
    db.prepare('UPDATE servers SET online_status = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(newStatus, req.params.id);
    
    res.json({ 
      success: true, 
      online: isReachable,
      ip: ip
    });
  } catch (error) {
    // ping失败
    db.prepare('UPDATE servers SET online_status = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run('offline', req.params.id);
    
    res.json({ 
      success: true, 
      online: false,
      ip: ip
    });
  }
});

// 批量Ping检测
router.post('/batch/ping', async (req, res) => {
  const db = getDatabase();
  const { ids } = req.body;
  
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: '无效的ID列表' });
  }
  
  const results: any[] = [];
  
  for (const id of ids) {
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(id) as any;
    if (!server) continue;
    
    const ip = server.system_ip || server.manage_ip;
    if (!ip) {
      results.push({ id, ip: null, online: false });
      continue;
    }
    
    try {
      const isWindows = process.platform === 'win32';
      const cmd = isWindows ? `ping -n 1 -w 1000 ${ip}` : `ping -c 1 -W 1 ${ip}`;
      const { stdout } = await execAsync(cmd);
      const isReachable = stdout.toLowerCase().includes('ttl=');
      const newStatus = isReachable ? 'online' : 'offline';
      
      db.prepare('UPDATE servers SET online_status = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(newStatus, id);
      
      results.push({ id, ip, online: isReachable });
    } catch (error) {
      db.prepare('UPDATE servers SET online_status = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run('offline', id);
      
      results.push({ id, ip, online: false });
    }
  }
  
  res.json({ success: true, results });
});

export default router;
