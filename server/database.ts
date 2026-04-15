import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../data/cmdb.db');

let db: Database.Database;

export function initDatabase() {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      environment TEXT,
      system_ip TEXT,
      manage_ip TEXT,
      oob_ip TEXT,
      mac_address TEXT,
      cabinet TEXT,
      u_position INTEGER DEFAULT 0,
      u_height INTEGER DEFAULT 2,
      sn TEXT,
      brand TEXT,
      model TEXT,
      cpu TEXT,
      memory TEXT,
      disk TEXT,
      network_card TEXT,
      role TEXT,
      role_type TEXT,
      tags TEXT,
      status TEXT DEFAULT '待上架',
      online_status TEXT DEFAULT 'unknown',
      last_heartbeat TEXT,
      remark TEXT,
      purchase_price REAL DEFAULT 0,
      purchase_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS change_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER,
      server_name TEXT,
      change_type TEXT,
      before_status TEXT,
      after_status TEXT,
      operator TEXT,
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (server_id) REFERENCES servers(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      display_name TEXT,
      role TEXT DEFAULT 'operator',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT,
      target TEXT,
      target_type TEXT,
      detail TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE,
      value TEXT,
      description TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 机柜配置表
    CREATE TABLE IF NOT EXISTS cabinets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      environment TEXT,
      total_u INTEGER DEFAULT 42,
      reserved_u TEXT DEFAULT '',
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 环境配置表
    CREATE TABLE IF NOT EXISTS environments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 标签配置表
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#6366f1',
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 版本历史表
    CREATE TABLE IF NOT EXISTS data_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version_number INTEGER UNIQUE NOT NULL,
      data_type TEXT NOT NULL,
      snapshot_data TEXT NOT NULL,
      description TEXT,
      operator TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 版本索引
    CREATE INDEX IF NOT EXISTS idx_data_versions_type ON data_versions(data_type);
    CREATE INDEX IF NOT EXISTS idx_data_versions_number ON data_versions(version_number);

    -- 自定义列配置表（用于环境列表等）
    CREATE TABLE IF NOT EXISTS custom_columns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_type TEXT NOT NULL,
      column_key TEXT NOT NULL,
      column_label TEXT NOT NULL,
      column_type TEXT DEFAULT 'text',
      options TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      visible INTEGER DEFAULT 1,
      width INTEGER DEFAULT 100,
      editable INTEGER DEFAULT 1,
      required INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(page_type, column_key)
    );

    -- 环境自定义字段值表
    CREATE TABLE IF NOT EXISTS environment_custom_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      environment_id INTEGER NOT NULL,
      column_key TEXT NOT NULL,
      column_value TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
      UNIQUE(environment_id, column_key)
    );

    -- 角色类型管理表（用于角色分类）
    CREATE TABLE IF NOT EXISTS role_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT 'Server',
      sort_order INTEGER DEFAULT 0,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 插入默认角色类型
    INSERT OR IGNORE INTO role_types (name, display_name, color, icon, sort_order, description) VALUES
      ('basic', '基础服务', '#3B82F6', 'Globe', 1, 'NTP、DNS、DHCP等基础服务'),
      ('lb', '负载均衡', '#22C55E', 'GitBranch', 2, 'LB、NGINX、HAProxy等负载均衡服务'),
      ('storage', '存储服务', '#F59E0B', 'HardDrive', 3, 'MINIO、Ceph、FastDFS等存储服务'),
      ('middleware', '中间件', '#8B5CF6', 'Database', 4, 'Redis、MySQL、Kafka等中间件'),
      ('container', '容器服务', '#06B6D4', 'Box', 5, 'K8S、Docker、Harbor等容器服务'),
      ('app', '业务应用', '#EC4899', 'Layers', 6, 'WEB、API、BGW等业务应用'),
      ('other', '其他', '#64748B', 'Server', 99, '未分类的角色');

    -- 迁移：如果 servers 表没有 role_type 列，则添加
    PRAGMA table_info(servers);
  `);

  // 检查并添加 role_type 列（如果不存在）
  try {
    const columns = db.prepare("PRAGMA table_info(servers)").all() as { name: string }[];
    const hasRoleType = columns.some(col => col.name === 'role_type');
    if (!hasRoleType) {
      db.exec('ALTER TABLE servers ADD COLUMN role_type TEXT DEFAULT ""');
      console.log('已为 servers 表添加 role_type 列');
    }
    
    // 检查并添加 purchase_price 列（如果不存在）
    const hasPurchasePrice = columns.some(col => col.name === 'purchase_price');
    if (!hasPurchasePrice) {
      db.exec('ALTER TABLE servers ADD COLUMN purchase_price REAL DEFAULT 0');
      console.log('已为 servers 表添加 purchase_price 列');
    }
    
    // 检查并添加 purchase_date 列（如果不存在）
    const hasPurchaseDate = columns.some(col => col.name === 'purchase_date');
    if (!hasPurchaseDate) {
      db.exec('ALTER TABLE servers ADD COLUMN purchase_date TEXT');
      console.log('已为 servers 表添加 purchase_date 列');
    }
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 创建默认管理员账号
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    db.prepare(`
      INSERT INTO users (username, password, display_name, role)
      VALUES (?, ?, ?, ?)
    `).run('admin', '21232f297a57a5a743894a0e4a801fc3', '管理员', 'admin');
  }

  // 初始化默认设置
  const settings = [
    { key: 'heartbeat_interval', value: '300', description: '心跳检测间隔（秒）' },
    { key: 'offline_threshold', value: '600', description: '离线告警阈值（秒）' },
    { key: 'system_name', value: 'CMDB', description: '系统名称（侧边栏显示）' },
    { key: 'platform_title', value: '研发环境服务器管理平台', description: '平台标题（顶部显示）' },
    { key: 'env_base_field_labels', value: '{"code":"架构","description":"说明"}', description: '环境基础字段标签配置' },
  ];
  
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)
  `);
  
  for (const s of settings) {
    insertSetting.run(s.key, s.value, s.description);
  }

  // 更新现有设置的描述（防止描述为空）
  const updateDescription = db.prepare(`
    UPDATE settings SET description = ? WHERE key = ? AND (description IS NULL OR description = '')
  `);
  
  for (const s of settings) {
    updateDescription.run(s.description, s.key);
  }

  console.log('数据库初始化完成');
  return db;
}

export function getDatabase() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

export default { initDatabase, getDatabase };
