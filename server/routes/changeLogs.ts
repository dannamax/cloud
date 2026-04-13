import express from 'express';
import { getDatabase } from '../database.js';

const router = express.Router();

// 获取变更历史
router.get('/', (req, res) => {
  const db = getDatabase();
  const { server_id, change_type, start_date, end_date, keyword } = req.query;
  
  let sql = 'SELECT * FROM change_logs WHERE 1=1';
  const params: any[] = [];
  
  if (server_id) {
    sql += ' AND server_id = ?';
    params.push(server_id);
  }
  if (change_type) {
    sql += ' AND change_type = ?';
    params.push(change_type);
  }
  if (start_date) {
    sql += ' AND created_at >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND created_at <= ?';
    params.push(end_date);
  }
  if (keyword) {
    sql += ' AND (server_name LIKE ? OR remark LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  const logs = db.prepare(sql).all(...params);
  res.json(logs);
});

// 获取单个服务器的变更历史
router.get('/server/:serverId', (req, res) => {
  const db = getDatabase();
  const logs = db.prepare(`
    SELECT * FROM change_logs 
    WHERE server_id = ? 
    ORDER BY created_at DESC 
    LIMIT 50
  `).all(req.params.serverId);
  res.json(logs);
});

// 获取变更统计
router.get('/stats', (req, res) => {
  const db = getDatabase();
  
  const byType = db.prepare(`
    SELECT change_type, COUNT(*) as count 
    FROM change_logs 
    GROUP BY change_type
  `).all();
  
  const recent = db.prepare(`
    SELECT * FROM change_logs 
    ORDER BY created_at DESC 
    LIMIT 10
  `).all();
  
  res.json({ byType, recent });
});

export default router;
