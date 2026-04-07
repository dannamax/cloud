import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { initDatabase } from './database.js';
import serversRouter from './routes/servers.js';
import changeLogsRouter from './routes/changeLogs.js';
import usersRouter from './routes/users.js';
import settingsRouter from './routes/settings.js';
import importRouter from './routes/import.js';
import cabinetsRouter from './routes/cabinets.js';
import environmentsRouter from './routes/environments.js';
import tagsRouter from './routes/tags.js';
import auditLogsRouter from './routes/auditLogs.js';
import versionsRouter from './routes/versions.js';
import customColumnsRouter from './routes/customColumns.js';
import { auditMiddleware } from './middleware/auditMiddleware.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3213;

// 创建数据目录
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 配置multer
const upload = multer({ dest: dataDir });

// 初始化数据库
initDatabase();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API网关审计中间件 - 必须放在路由注册之前
app.use('/api', auditMiddleware);

// 静态文件服务
app.use('/data', express.static(path.join(__dirname, '../data')));

// 路由
app.use('/api/servers', serversRouter);
app.use('/api/change-logs', changeLogsRouter);
app.use('/api/users', usersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/import', importRouter);
app.use('/api/cabinets', cabinetsRouter);
app.use('/api/environments', environmentsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api', versionsRouter);
app.use('/api/custom-columns', customColumnsRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 生产环境：提供前端静态文件
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  // 处理 SPA 路由 - 所有非 API 路由返回 index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

export { upload };
