import express from 'express';
import { getDatabase, getLocalTime } from '../database.js';

const router = express.Router();

// 获取所有机柜
router.get('/', (req, res) => {
  const db = getDatabase();
  const { environment, keyword } = req.query;
  
  let sql = 'SELECT * FROM cabinets WHERE 1=1';
  const params: any[] = [];
  
  if (environment) {
    sql += ' AND environment = ?';
    params.push(environment);
  }
  if (keyword) {
    sql += ' AND (name LIKE ? OR remark LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  
  sql += ' ORDER BY name ASC';
  
  const cabinets = db.prepare(sql).all(...params);
  res.json(cabinets);
});

// 获取单个机柜
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const cabinet = db.prepare('SELECT * FROM cabinets WHERE id = ?').get(req.params.id);
  
  if (!cabinet) {
    return res.status(404).json({ error: '机柜不存在' });
  }
  
  res.json(cabinet);
});

// 从服务器数据同步机柜
router.post('/sync-with-servers', (req, res) => {
  const db = getDatabase();
  
  // 从servers表提取唯一的机柜信息，包含关联环境和服务器数量
  const serverCabinets = db.prepare(`
    SELECT 
      cabinet as name,
      environment,
      COUNT(*) as server_count
    FROM servers 
    WHERE cabinet IS NOT NULL AND cabinet != ''
    GROUP BY cabinet, environment
  `).all() as any[];
  
  if (serverCabinets.length === 0) {
    return res.json({ success: true, added: 0, updated: 0, message: '服务器数据中无机柜信息' });
  }
  
  let added = 0;
  let updated = 0;
  
  const syncCabinets = db.transaction((cabinets: any[]) => {
    for (const cabinet of cabinets) {
      const existing = db.prepare('SELECT id, remark FROM cabinets WHERE name = ?').get(cabinet.name) as any;
      
      if (existing) {
        // 更新已有机柜的环境和备注（服务器数量）
        const newRemark = `服务器数量: ${cabinet.server_count}`;
        db.prepare(`
          UPDATE cabinets SET environment = ?, remark = ?, updated_at = ?
          WHERE id = ?
        `).run(cabinet.environment || '', newRemark, getLocalTime(), existing.id);
        updated++;
      } else {
        // 插入新机柜
        const remark = `服务器数量: ${cabinet.server_count}`;
        db.prepare(`
          INSERT INTO cabinets (name, environment, total_u, reserved_u, remark)
          VALUES (?, ?, 42, '', ?)
        `).run(cabinet.name, cabinet.environment || '', remark);
        added++;
      }
    }
  });
  
  syncCabinets(serverCabinets);
  
  res.json({ 
    success: true, 
    added, 
    updated, 
    total: added + updated,
    message: `同步完成：新增 ${added} 个，更新 ${updated} 个` 
  });
});

// 创建机柜
router.post('/', (req, res) => {
  const db = getDatabase();
  const { name, environment, total_u, reserved_u, remark } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '机柜名称不能为空' });
  }
  
  // 检查是否已存在
  const exists = db.prepare('SELECT id FROM cabinets WHERE name = ?').get(name);
  if (exists) {
    return res.status(400).json({ error: '机柜名称已存在' });
  }
  
  const result = db.prepare(`
    INSERT INTO cabinets (name, environment, total_u, reserved_u, remark)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, environment, total_u || 42, reserved_u || '', remark || '');
  
  const cabinet = db.prepare('SELECT * FROM cabinets WHERE id = ?').get(result.lastInsertRowid);
  
  res.json(cabinet);
});

// 更新机柜
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { name, environment, total_u, reserved_u, remark } = req.body;
  
  const existing = db.prepare('SELECT * FROM cabinets WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    return res.status(404).json({ error: '机柜不存在' });
  }
  
  // 检查名称是否与其他机柜重复
  if (name) {
    const duplicate = db.prepare('SELECT id FROM cabinets WHERE name = ? AND id != ?').get(name, req.params.id);
    if (duplicate) {
      return res.status(400).json({ error: '机柜名称已存在' });
    }
  }
  
  db.prepare(`
    UPDATE cabinets SET
      name = COALESCE(?, name),
      environment = COALESCE(?, environment),
      total_u = COALESCE(?, total_u),
      reserved_u = COALESCE(?, reserved_u),
      remark = COALESCE(?, remark),
      updated_at = ?
    WHERE id = ?
  `).run(name, environment, total_u, reserved_u, remark, getLocalTime(), req.params.id);
  
  const cabinet = db.prepare('SELECT * FROM cabinets WHERE id = ?').get(req.params.id);
  
  res.json(cabinet);
});

// 删除机柜
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  
  const existing = db.prepare('SELECT * FROM cabinets WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    return res.status(404).json({ error: '机柜不存在' });
  }
  
  // 检查是否有服务器关联
  const serverCount = db.prepare('SELECT COUNT(*) as count FROM servers WHERE cabinet = ?').get(existing.name) as any;
  if (serverCount.count > 0) {
    return res.status(400).json({ error: '该机柜下有关联服务器，无法删除' });
  }
  
  const result = db.prepare('DELETE FROM cabinets WHERE id = ?').run(req.params.id);
  res.json({ success: result.changes > 0 });
});

export default router;
