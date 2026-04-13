import express from 'express';
import { getDatabase } from '../database.js';

const router = express.Router();

// 获取自定义列配置
router.get('/', (req, res) => {
  const db = getDatabase();
  const { page_type } = req.query;
  
  let sql = 'SELECT * FROM custom_columns WHERE 1=1';
  const params: any[] = [];
  
  if (page_type) {
    sql += ' AND page_type = ?';
    params.push(page_type);
  }
  
  sql += ' ORDER BY sort_order ASC, id ASC';
  
  const columns = db.prepare(sql).all(...params);
  
  // 解析 options JSON（兼容空字符串和逗号分隔格式）
  const result = columns.map((col: any) => {
    let options: string[] = [];
    if (col.options) {
      try {
        // 尝试解析为 JSON 数组
        options = JSON.parse(col.options);
      } catch {
        // 如果失败，尝试按逗号分隔
        if (typeof col.options === 'string' && col.options.includes(',')) {
          options = col.options.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else if (col.options) {
          options = [col.options];
        }
      }
    }
    return {
      ...col,
      options,
      visible: Boolean(col.visible),
      editable: Boolean(col.editable),
      required: Boolean(col.required)
    };
  });
  
  res.json(result);
});

// 创建自定义列
router.post('/', (req, res) => {
  const db = getDatabase();
  const { page_type, column_key, column_label, column_type, options, sort_order, visible, width, editable, required } = req.body;
  
  if (!page_type || !column_key || !column_label) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  // 检查是否已存在
  const existing = db.prepare('SELECT id FROM custom_columns WHERE page_type = ? AND column_key = ?').get(page_type, column_key);
  if (existing) {
    return res.status(400).json({ error: '该列已存在' });
  }
  
  const result = db.prepare(`
    INSERT INTO custom_columns (page_type, column_key, column_label, column_type, options, sort_order, visible, width, editable, required)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    page_type,
    column_key,
    column_label,
    column_type || 'text',
    options ? JSON.stringify(options) : '',
    sort_order || 0,
    visible !== undefined ? (visible ? 1 : 0) : 1,
    width || 100,
    editable !== undefined ? (editable ? 1 : 0) : 1,
    required !== undefined ? (required ? 1 : 0) : 0
  );
  
  const column = db.prepare('SELECT * FROM custom_columns WHERE id = ?').get(result.lastInsertRowid) as any;

  // 解析 options（兼容空字符串和逗号分隔格式）
  let colOptions: string[] = [];
  if (column.options) {
    try {
      colOptions = JSON.parse(column.options);
    } catch {
      if (typeof column.options === 'string' && column.options.includes(',')) {
        colOptions = column.options.split(',').map((s: string) => s.trim()).filter(Boolean);
      } else if (column.options) {
        colOptions = [column.options];
      }
    }
  }

  res.json({
    ...column,
    options: colOptions,
    visible: Boolean(column.visible),
    editable: Boolean(column.editable),
    required: Boolean(column.required)
  });
});

// 更新自定义列
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { column_label, column_type, options, sort_order, visible, width, editable, required } = req.body;
  
  const existing = db.prepare('SELECT * FROM custom_columns WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '列不存在' });
  }
  
  // 处理 options：如果传入数组则转为逗号分隔字符串
  const optionsStr = options !== undefined 
    ? (Array.isArray(options) ? options.join(',') : String(options))
    : null;

  db.prepare(`
    UPDATE custom_columns SET
      column_label = COALESCE(?, column_label),
      column_type = COALESCE(?, column_type),
      options = COALESCE(?, options),
      sort_order = COALESCE(?, sort_order),
      visible = COALESCE(?, visible),
      width = COALESCE(?, width),
      editable = COALESCE(?, editable),
      required = COALESCE(?, required),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    column_label,
    column_type,
    optionsStr,
    sort_order,
    visible !== undefined ? (visible ? 1 : 0) : null,
    width,
    editable !== undefined ? (editable ? 1 : 0) : null,
    required !== undefined ? (required ? 1 : 0) : null,
    req.params.id
  );

  const column = db.prepare('SELECT * FROM custom_columns WHERE id = ?').get(req.params.id) as any;

  // 解析 options（兼容空字符串和逗号分隔格式）
  let colOptions: string[] = [];
  if (column.options) {
    try {
      colOptions = JSON.parse(column.options);
    } catch {
      if (typeof column.options === 'string' && column.options.includes(',')) {
        colOptions = column.options.split(',').map((s: string) => s.trim()).filter(Boolean);
      } else if (column.options) {
        colOptions = [column.options];
      }
    }
  }

  res.json({
    ...column,
    options: colOptions,
    visible: Boolean(column.visible),
    editable: Boolean(column.editable),
    required: Boolean(column.required)
  });
});

// 删除自定义列
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  
  const existing = db.prepare('SELECT * FROM custom_columns WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '列不存在' });
  }
  
  db.prepare('DELETE FROM custom_columns WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
