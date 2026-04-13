import express from 'express';
import { getDatabase } from '../database.js';

const router = express.Router();

// 获取所有设置
router.get('/', (req, res) => {
  const db = getDatabase();
  const settings = db.prepare('SELECT * FROM settings').all();
  res.json(settings);
});

// 获取单个设置
router.get('/:key', (req, res) => {
  const db = getDatabase();
  const { key } = req.params;
  
  const setting = db.prepare('SELECT * FROM settings WHERE key = ?').get(key);
  if (!setting) {
    return res.status(404).json({ error: '设置不存在' });
  }
  res.json(setting);
});

// 创建或更新设置
router.put('/:key', (req, res) => {
  const db = getDatabase();
  const { value } = req.body;
  const { key } = req.params;
  
  const existing = db.prepare('SELECT * FROM settings WHERE key = ?').get(key);
  if (existing) {
    db.prepare(`
      UPDATE settings SET value = ?, updated_at = datetime('now')
      WHERE key = ?
    `).run(value, key);
  } else {
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    `).run(key, value);
  }
  
  const setting = db.prepare('SELECT * FROM settings WHERE key = ?').get(key);
  res.json(setting);
});

// 导出数据
router.get('/export', (req, res) => {
  const db = getDatabase();
  const servers = db.prepare('SELECT * FROM servers').all();
  const changeLogs = db.prepare('SELECT * FROM change_logs').all();
  
  res.json({
    servers,
    changeLogs,
    exportedAt: new Date().toISOString(),
  });
});

// 清空数据
router.delete('/clear', (req, res) => {
  const db = getDatabase();
  const { type } = req.body;
  
  if (type === 'servers') {
    db.prepare('DELETE FROM servers').run();
    db.prepare('DELETE FROM change_logs').run();
  } else if (type === 'logs') {
    db.prepare('DELETE FROM change_logs').run();
    db.prepare('DELETE FROM operation_logs').run();
  }
  
  res.json({ success: true });
});

export default router;
