import express from 'express';
import { getDatabase, getLocalTime } from '../database.js';

const router = express.Router();

// 获取所有角色类型
router.get('/', (req, res) => {
  const db = getDatabase();
  const roleTypes = db.prepare('SELECT * FROM role_types ORDER BY sort_order ASC, id ASC').all();
  res.json(roleTypes);
});

// 创建角色类型
router.post('/', (req, res) => {
  const db = getDatabase();
  const { name, display_name, color, icon, sort_order, description } = req.body;

  if (!name || !display_name) {
    return res.status(400).json({ error: '缺少必要参数：name 和 display_name' });
  }

  // 检查是否已存在
  const existing = db.prepare('SELECT id FROM role_types WHERE name = ?').get(name);
  if (existing) {
    return res.status(400).json({ error: '该角色类型已存在' });
  }

  const result = db.prepare(`
    INSERT INTO role_types (name, display_name, color, icon, sort_order, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    name,
    display_name,
    color || '#6366f1',
    icon || 'Server',
    sort_order || 0,
    description || ''
  );

  const roleType = db.prepare('SELECT * FROM role_types WHERE id = ?').get(result.lastInsertRowid);
  res.json(roleType);
});

// 更新角色类型
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { display_name, color, icon, sort_order, description } = req.body;

  const existing = db.prepare('SELECT * FROM role_types WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '角色类型不存在' });
  }

  db.prepare(`
    db.prepare(`
    UPDATE role_types SET
      display_name = COALESCE(?, display_name),
      color = COALESCE(?, color),
      icon = COALESCE(?, icon),
      sort_order = COALESCE(?, sort_order),
      description = COALESCE(?, description),
      updated_at = ?
    WHERE id = ?
  `).run(
    display_name,
    color,
    icon,
    sort_order,
    description,
    getLocalTime(),
    req.params.id
  );

  const roleType = db.prepare('SELECT * FROM role_types WHERE id = ?').get(req.params.id);
  res.json(roleType);
});

// 删除角色类型
router.delete('/:id', (req, res) => {
  const db = getDatabase();

  const existing = db.prepare('SELECT * FROM role_types WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '角色类型不存在' });
  }

  // 检查是否有服务器使用该角色类型
  const usedCount = db.prepare('SELECT COUNT(*) as count FROM servers WHERE role_type = ?').get((existing as any).name);
  if ((usedCount as any).count > 0) {
    return res.status(400).json({ error: `该角色类型已被 ${(usedCount as any).count} 台服务器使用，无法删除` });
  }

  db.prepare('DELETE FROM role_types WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// 获取按角色类型分组的角色列表
router.get('/grouped-roles', (req, res) => {
  const db = getDatabase();

  // 获取所有角色类型
  const roleTypes = db.prepare('SELECT * FROM role_types ORDER BY sort_order ASC').all() as any[];

  // 获取所有角色及其角色类型
  const roles = db.prepare(`
    SELECT role, role_type, COUNT(*) as count
    FROM servers
    WHERE role IS NOT NULL AND role != ''
    GROUP BY role, role_type
    ORDER BY count DESC
  `).all() as any[];

  // 按角色类型分组
  const grouped = new Map<string, { role: string; count: number }[]>();
  const ungrouped: { role: string; count: number }[] = [];

  roles.forEach(r => {
    if (r.role_type) {
      if (!grouped.has(r.role_type)) {
        grouped.set(r.role_type, []);
      }
      grouped.get(r.role_type)!.push({ role: r.role, count: r.count });
    } else {
      ungrouped.push({ role: r.role, count: r.count });
    }
  });

  // 构建结果
  const result = roleTypes.map(rt => ({
    ...rt,
    roles: grouped.get(rt.name) || []
  }));

  // 添加未分类的
  if (ungrouped.length > 0) {
    const otherType = roleTypes.find(rt => rt.name === 'other');
    if (otherType) {
      otherType.roles = [...(otherType.roles || []), ...ungrouped];
    } else {
      result.push({
        id: 0,
        name: 'other',
        display_name: '其他',
        color: '#64748B',
        icon: 'Server',
        sort_order: 99,
        description: '未分类的角色',
        roles: ungrouped
      });
    }
  }

  res.json(result);
});

export default router;
