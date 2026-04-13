import express from 'express';
import crypto from 'crypto';
import { getDatabase } from '../database.js';

const router = express.Router();

// 简单密码哈希
function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

// 用户登录
router.post('/login', (req, res) => {
  const db = getDatabase();
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  
  const passwordHash = md5(password);
  const user = db.prepare(`
    SELECT id, username, display_name, role, status 
    FROM users 
    WHERE username = ? AND password = ? AND status = 'active'
  `).get(username, passwordHash) as any;
  
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  
  // 生成简单token
  const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
  
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
    }
  });
});

// 获取当前用户信息
router.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }
  
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const userId = parseInt(decoded.split(':')[0]);
    
    const db = getDatabase();
    const user = db.prepare(`
      SELECT id, username, display_name, role, status 
      FROM users WHERE id = ?
    `).get(userId) as any;
    
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }
    
    res.json(user);
  } catch {
    res.status(401).json({ error: '无效的token' });
  }
});

// 获取所有用户
router.get('/', (req, res) => {
  const db = getDatabase();
  const users = db.prepare(`
    SELECT id, username, display_name, role, status, created_at 
    FROM users 
    ORDER BY id
  `).all();
  res.json(users);
});

// 创建用户
router.post('/', (req, res) => {
  const db = getDatabase();
  const { username, password, display_name, role } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ error: '用户名已存在' });
  }
  
  const passwordHash = md5(password);
  const result = db.prepare(`
    INSERT INTO users (username, password, display_name, role)
    VALUES (?, ?, ?, ?)
  `).run(username, passwordHash, display_name || username, role || 'operator');
  
  const user = db.prepare(`
    SELECT id, username, display_name, role, status 
    FROM users WHERE id = ?
  `).get(result.lastInsertRowid);
  
  res.json(user);
});

// 更新用户
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { display_name, role, status, password } = req.body;
  
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '用户不存在' });
  }
  
  // 保留原有状态，如果未提供
  const existingStatus = (existing as any).status;
  const userStatus = (status && status.trim()) ? status : (existingStatus || 'active');
  
  if (password) {
    const passwordHash = md5(password);
    db.prepare(`
      UPDATE users SET display_name = ?, role = ?, status = ?, password = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(display_name, role, userStatus, passwordHash, req.params.id);
  } else {
    db.prepare(`
      UPDATE users SET display_name = ?, role = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(display_name, role, userStatus, req.params.id);
  }
  
  const user = db.prepare(`
    SELECT id, username, display_name, role, status 
    FROM users WHERE id = ?
  `).get(req.params.id);
  
  res.json(user);
});

// 删除用户
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  if ((user as any).username === 'admin') {
    return res.status(400).json({ error: '不能删除管理员账号' });
  }

  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: result.changes > 0 });
});

// 修改密码
router.post('/:id/change-password', (req, res) => {
  const db = getDatabase();
  const { oldPassword, newPassword } = req.body;
  const userId = parseInt(req.params.id);

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '旧密码和新密码不能为空' });
  }

  // 检查新密码复杂度
  if (newPassword.length < 8) {
    return res.status(400).json({ error: '密码长度至少8个字符' });
  }
  if (!/[A-Z]/.test(newPassword)) {
    return res.status(400).json({ error: '密码必须包含大写字母' });
  }
  if (!/[a-z]/.test(newPassword)) {
    return res.status(400).json({ error: '密码必须包含小写字母' });
  }
  if (!/\d/.test(newPassword)) {
    return res.status(400).json({ error: '密码必须包含数字' });
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
    return res.status(400).json({ error: '密码必须包含特殊字符' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  // 验证旧密码
  const oldPasswordHash = md5(oldPassword);
  if (user.password !== oldPasswordHash) {
    return res.status(401).json({ error: '旧密码错误' });
  }

  // 更新新密码
  const newPasswordHash = md5(newPassword);
  db.prepare(`UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?`).run(newPasswordHash, userId);

  res.json({ success: true, message: '密码修改成功' });
});

export default router;
