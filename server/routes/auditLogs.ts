import express from 'express';
import { getDatabase, getLocalTime } from '../database.js';

const router = express.Router();

// 获取审计日志列表
router.get('/', (req, res) => {
  const db = getDatabase();
  const { 
    username, 
    action, 
    target_type,
    start_date, 
    end_date, 
    keyword,
    page = '1',
    page_size = '20'
  } = req.query;
  
  let sql = 'SELECT * FROM operation_logs WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM operation_logs WHERE 1=1';
  const params: any[] = [];
  const countParams: any[] = [];
  
  if (username) {
    sql += ' AND username LIKE ?';
    countSql += ' AND username LIKE ?';
    params.push(`%${username}%`);
    countParams.push(`%${username}%`);
  }
  
  if (action) {
    sql += ' AND action = ?';
    countSql += ' AND action = ?';
    params.push(action);
    countParams.push(action);
  }
  
  if (target_type) {
    sql += ' AND target_type = ?';
    countSql += ' AND target_type = ?';
    params.push(target_type);
    countParams.push(target_type);
  }
  
  if (start_date) {
    sql += ' AND created_at >= ?';
    countSql += ' AND created_at >= ?';
    params.push(start_date);
    countParams.push(start_date);
  }
  
  if (end_date) {
    sql += ' AND created_at <= ?';
    countSql += ' AND created_at <= ?';
    params.push(end_date + ' 23:59:59');
    countParams.push(end_date + ' 23:59:59');
  }
  
  if (keyword) {
    sql += ' AND (target LIKE ? OR detail LIKE ?)';
    countSql += ' AND (target LIKE ? OR detail LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
    countParams.push(`%${keyword}%`, `%${keyword}%`);
  }
  
  // 获取总数
  const totalResult = db.prepare(countSql).get(...countParams) as any;
  const total = totalResult?.total || 0;
  
  // 分页
  const offset = (parseInt(page as string) - 1) * parseInt(page_size as string);
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(page_size as string), offset);
  
  const logs = db.prepare(sql).all(...params);
  
  res.json({
    data: logs,
    total,
    page: parseInt(page as string),
    page_size: parseInt(page_size as string),
  });
});

// 获取审计统计数据
router.get('/stats', (req, res) => {
  const db = getDatabase();
  
  // 使用 JavaScript 计算日期（避免 SQLite UTC 时区问题）
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // 今日操作数
  const today = db.prepare(`
    SELECT COUNT(*) as count FROM operation_logs 
    WHERE date(created_at) = ?
  `).get(todayStr) as any;
  
  // 本周操作数
  const week = db.prepare(`
    SELECT COUNT(*) as count FROM operation_logs 
    WHERE created_at >= ?
  `).get(weekAgo) as any;
  
  // 按操作类型统计
  const byAction = db.prepare(`
    SELECT action, COUNT(*) as count 
    FROM operation_logs 
    GROUP BY action 
    ORDER BY count DESC
  `).all();
  
  // 按用户统计
  const byUser = db.prepare(`
    SELECT username, COUNT(*) as count 
    FROM operation_logs 
    GROUP BY username 
    ORDER BY count DESC
    LIMIT 10
  `).all();
  
  // 按目标类型统计
  const byTarget = db.prepare(`
    SELECT target_type, COUNT(*) as count 
    FROM operation_logs 
    WHERE target_type IS NOT NULL AND target_type != ''
    GROUP BY target_type 
    ORDER BY count DESC
  `).all();
  
  res.json({
    today: today?.count || 0,
    week: week?.count || 0,
    byAction,
    byUser,
    byTarget,
  });
});

// 获取操作类型列表
router.get('/actions', (req, res) => {
  const db = getDatabase();
  const actions = db.prepare(`
    SELECT DISTINCT action FROM operation_logs ORDER BY action
  `).all();
  res.json(actions.map((a: any) => a.action));
});

// 获取目标类型列表
router.get('/target-types', (req, res) => {
  const db = getDatabase();
  const types = db.prepare(`
    SELECT DISTINCT target_type FROM operation_logs 
    WHERE target_type IS NOT NULL AND target_type != ''
    ORDER BY target_type
  `).all();
  res.json(types.map((t: any) => t.target_type));
});

// 记录操作日志
router.post('/', (req, res) => {
  const db = getDatabase();
  const { user_id, username, action, target, target_type, detail, ip_address } = req.body;
  
  if (!action) {
    return res.status(400).json({ error: '操作类型不能为空' });
  }
  
  const result = db.prepare(`
    INSERT INTO operation_logs (user_id, username, action, target, target_type, detail, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(user_id, username, action, target, target_type, detail, ip_address);
  
  const log = db.prepare('SELECT * FROM operation_logs WHERE id = ?').get(result.lastInsertRowid);
  res.json(log);
});

// 获取单条审计日志详情
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const log = db.prepare('SELECT * FROM operation_logs WHERE id = ?').get(req.params.id);
  
  if (!log) {
    return res.status(404).json({ error: '审计日志不存在' });
  }
  
  res.json(log);
});

export default router;
