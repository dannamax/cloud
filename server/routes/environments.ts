import express from 'express';
import { getDatabase, getLocalTime } from '../database.js';

const router = express.Router();

// 获取所有环境
router.get('/', (req, res) => {
  const db = getDatabase();
  const { status, keyword } = req.query;
  
  let sql = 'SELECT * FROM environments WHERE 1=1';
  const params: any[] = [];
  
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (keyword) {
    sql += ' AND (name LIKE ? OR code LIKE ? OR description LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  
  sql += ' ORDER BY sort_order ASC, name ASC';
  
  const environments = db.prepare(sql).all(...params);
  
  // 获取自定义字段配置
  const customColumns = db.prepare("SELECT * FROM custom_columns WHERE page_type = 'environments' AND visible = 1 ORDER BY sort_order").all() as any[];
  
  // 获取自定义字段值
  if (customColumns.length > 0 && environments.length > 0) {
    const envIds = environments.map((e: any) => e.id);
    const placeholders = envIds.map(() => '?').join(',');
    const customValues = db.prepare(`SELECT * FROM environment_custom_values WHERE environment_id IN (${placeholders})`).all(...envIds) as any[];
    
    // 按environment_id分组
    const valuesByEnv: Record<number, Record<string, string>> = {};
    for (const v of customValues) {
      if (!valuesByEnv[v.environment_id]) {
        valuesByEnv[v.environment_id] = {};
      }
      valuesByEnv[v.environment_id][v.column_key] = v.column_value;
    }
    
    // 合并到环境数据中
    for (const env of environments as any[]) {
      env.customFields = valuesByEnv[env.id] || {};
    }
  } else {
    for (const env of environments as any[]) {
      env.customFields = {};
    }
  }
  
  res.json(environments);
});

// 获取单个环境
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const environment = db.prepare('SELECT * FROM environments WHERE id = ?').get(req.params.id);
  
  if (!environment) {
    return res.status(404).json({ error: '环境不存在' });
  }
  
  res.json(environment);
});

// 从服务器数据同步环境
router.post('/sync', (req, res) => {
  const db = getDatabase();
  
  // 从servers表提取唯一的环境名称
  const serverEnvironments = db.prepare(`
    SELECT DISTINCT environment as name
    FROM servers 
    WHERE environment IS NOT NULL AND environment != ''
  `).all() as any[];
  
  if (serverEnvironments.length === 0) {
    return res.json({ success: true, added: 0, message: '服务器数据中无环境信息' });
  }
  
  let added = 0;
  
  const syncEnvironments = db.transaction((environments: any[]) => {
    for (const env of environments) {
      const existing = db.prepare('SELECT id FROM environments WHERE name = ?').get(env.name);
      
      if (!existing) {
        // 插入新环境，默认启用
        db.prepare(`
          INSERT INTO environments (name, code, description, sort_order, status)
          VALUES (?, ?, '', 0, 'active')
        `).run(env.name, env.name.toLowerCase().replace(/\s+/g, '_'));
        added++;
      }
    }
  });
  
  syncEnvironments(serverEnvironments);
  
  res.json({ 
    success: true, 
    added, 
    total: serverEnvironments.length,
    message: `同步完成：新增 ${added} 个环境` 
  });
});

// 创建环境
router.post('/', (req, res) => {
  const db = getDatabase();
  const { name, code, description, sort_order, status } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '环境名称不能为空' });
  }
  
  // 检查是否已存在
  const exists = db.prepare('SELECT id FROM environments WHERE name = ?').get(name);
  if (exists) {
    return res.status(400).json({ error: '环境名称已存在' });
  }
  
  const result = db.prepare(`
    INSERT INTO environments (name, code, description, sort_order, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, code || '', description || '', sort_order || 0, status || 'active');
  
  const environment = db.prepare('SELECT * FROM environments WHERE id = ?').get(result.lastInsertRowid);
  
  res.json(environment);
});

// 更新环境
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { name, code, description, sort_order, status, customFields } = req.body;
  
  const existing = db.prepare('SELECT * FROM environments WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    return res.status(404).json({ error: '环境不存在' });
  }
  
  // 检查名称是否与其他环境重复
  if (name) {
    const duplicate = db.prepare('SELECT id FROM environments WHERE name = ? AND id != ?').get(name, req.params.id);
    if (duplicate) {
      return res.status(400).json({ error: '环境名称已存在' });
    }
  }
  
  db.prepare(`
  const now = getLocalTime();
  
  db.prepare(`
    UPDATE environments SET
      name = COALESCE(?, name),
      code = COALESCE(?, code),
      description = COALESCE(?, description),
      sort_order = COALESCE(?, sort_order),
      status = COALESCE(?, status),
      updated_at = ?
    WHERE id = ?
  `).run(name, code, description, sort_order, status, now, req.params.id);

  // 如果环境名称变更，级联更新关联的 servers 和 cabinets 表
  if (name && name !== existing.name) {
    db.prepare('UPDATE servers SET environment = ? WHERE environment = ?').run(name, existing.name);
    db.prepare('UPDATE cabinets SET environment = ? WHERE environment = ?').run(name, existing.name);
  }

  // 更新自定义字段值
  if (customFields && typeof customFields === 'object') {
    const upsertValue = db.prepare(`
      INSERT INTO environment_custom_values (environment_id, column_key, column_value, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(environment_id, column_key) 
      DO UPDATE SET column_value = excluded.column_value, updated_at = ?
    `);
    
    for (const [key, value] of Object.entries(customFields)) {
      upsertValue.run(req.params.id, key, String(value || ''), now, now);
    }
  }
  
  const environment = db.prepare('SELECT * FROM environments WHERE id = ?').get(req.params.id);
  
  // 返回时包含自定义字段值
  const customColumns = db.prepare("SELECT * FROM custom_columns WHERE page_type = 'environments' AND visible = 1 ORDER BY sort_order").all() as any[];
  if (customColumns.length > 0) {
    const customValues = db.prepare('SELECT * FROM environment_custom_values WHERE environment_id = ?').all(req.params.id) as any[];
    const valuesMap: Record<string, string> = {};
    for (const v of customValues) {
      valuesMap[v.column_key] = v.column_value;
    }
    (environment as any).customFields = valuesMap;
  } else {
    (environment as any).customFields = {};
  }
  
  res.json(environment);
});

// 删除环境
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  
  const existing = db.prepare('SELECT * FROM environments WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    return res.status(404).json({ error: '环境不存在' });
  }
  
  // 检查是否有服务器关联
  const serverCount = db.prepare('SELECT COUNT(*) as count FROM servers WHERE environment = ?').get(existing.name) as any;
  if (serverCount.count > 0) {
    return res.status(400).json({ error: '该环境下有关联服务器，无法删除' });
  }
  
  const result = db.prepare('DELETE FROM environments WHERE id = ?').run(req.params.id);
  res.json({ success: result.changes > 0 });
});

export default router;
