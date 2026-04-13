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
      tags TEXT,
      status TEXT DEFAULT '待上架',
      online_status TEXT DEFAULT 'unknown',
      last_heartbeat TEXT,
      remark TEXT,
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
  `);

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
  ];
  
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)
  `);
  
  for (const s of settings) {
    insertSetting.run(s.key, s.value, s.description);
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
