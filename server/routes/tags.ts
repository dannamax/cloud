import express from 'express';
import { getDatabase } from '../database.js';

const router = express.Router();

// 获取所有标签
router.get('/', (req, res) => {
  const db = getDatabase();
  const { keyword } = req.query;
  
  let sql = 'SELECT * FROM tags WHERE 1=1';
  const params: any[] = [];
  
  if (keyword) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  
  sql += ' ORDER BY id ASC';
  
  const tags = db.prepare(sql).all(...params);
  res.json(tags);
});

// 获取单个标签
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
  
  if (!tag) {
    return res.status(404).json({ error: '标签不存在' });
  }
  
  res.json(tag);
});

// 创建标签
router.post('/', (req, res) => {
  const db = getDatabase();
  const { name, color, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '标签名称不能为空' });
  }
  
  // 检查是否已存在
  const exists = db.prepare('SELECT id FROM tags WHERE name = ?').get(name);
  if (exists) {
    return res.status(400).json({ error: '标签名称已存在' });
  }
  
  const result = db.prepare(`
    INSERT INTO tags (name, color, description)
    VALUES (?, ?, ?)
  `).run(name, color || '#6366f1', description || '');
  
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
  
  res.json(tag);
});

// 更新标签
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { name, color, description } = req.body;
  
  const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '标签不存在' });
  }
  
  // 检查名称是否与其他标签重复
  if (name) {
    const duplicate = db.prepare('SELECT id FROM tags WHERE name = ? AND id != ?').get(name, req.params.id);
    if (duplicate) {
      return res.status(400).json({ error: '标签名称已存在' });
    }
  }
  
  db.prepare(`
    UPDATE tags SET
      name = COALESCE(?, name),
      color = COALESCE(?, color),
      description = COALESCE(?, description)
    WHERE id = ?
  `).run(name, color, description, req.params.id);
  
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
  res.json(tag);
});

// 删除标签
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  
  const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '标签不存在' });
  }
  
  const result = db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
  res.json({ success: result.changes > 0 });
});

export default router;
