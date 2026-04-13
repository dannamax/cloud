import express from 'express';
import XLSX from 'xlsx';
import { getDatabase } from '../database.js';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { parse as parseMultipart } from 'url';
import Busboy from 'busboy';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = express.Router();

// 创建上传目录
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 文件上传接口
router.post('/upload', (req, res) => {
  const contentType = req.headers['content-type'] || '';
  
  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({ error: '需要 multipart/form-data' });
  }
  
  const bb = Busboy({ headers: req.headers });
  let filePath = '';
  let filename = '';
  
  bb.on('file', (name, file, info) => {
    filename = info.filename;
    // 使用时间戳+随机数生成唯一文件名，避免中文编码问题
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ext = path.extname(filename);
    filePath = path.join(uploadDir, `${uniqueName}${ext}`);
    const stream = fs.createWriteStream(filePath);
    file.pipe(stream);
  });
  
  bb.on('finish', () => {
    res.json({ success: true, filePath, filename });
  });
  
  bb.on('error', (err) => {
    res.status(500).json({ error: '上传失败: ' + err.message });
  });
  
  req.pipe(bb);
});

// 从Excel导入服务器数据（增强版 - 自动关联机柜、环境、标签）
router.post('/import', (req, res) => {
  const db = getDatabase();
  
  const { filePath, sheetIndex = 0 } = req.body;
  
  if (!filePath) {
    return res.status(400).json({ error: '请提供文件路径' });
  }
  
  if (!fs.existsSync(filePath)) {
    return res.status(400).json({ error: '文件不存在' });
  }
  
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    const sheetName = sheetNames[sheetIndex] || sheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (!data || data.length === 0) {
      return res.json({ success: true, imported: 0, message: '无数据' });
    }
    
    const result = {
      imported: 0,
      environments: { created: 0, existing: 0 },
      cabinets: { created: 0, existing: 0 },
      tags: { created: 0, existing: 0 },
      errors: [] as string[],
    };
    
    // 事务处理
    const importTransaction = db.transaction(() => {
      // 确保机柜表存在
      db.prepare(`CREATE TABLE IF NOT EXISTS cabinets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        environment TEXT DEFAULT '',
        total_u INTEGER DEFAULT 42,
        reserved_u TEXT DEFAULT '',
        remark TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`).run();
      
      // 确保标签表存在
      db.prepare(`CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT DEFAULT '#6366f1',
        description TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )`).run();
      
      // 收集需要的环境、机柜、标签
      const environments = new Set<string>();
      const cabinets = new Map<string, string>(); // cabinet -> environment
      const allTags = new Set<string>();
      
      // 兼容多种列名格式
      const envKeys = ['环境', 'environment', 'env', 'ENV', 'Env', '环', '环境名称', '环境名'];
      const cabinetKeys = ['机柜', 'cabinet', 'Cabinet', '机柜名称', '机柜名', '机架'];
      const tagKeys = ['标签', 'tags', 'Tags', 'TAG', 'Tag', '标签列表'];
      
      const getFieldValue = (row: any, keys: string[]): string => {
        for (const key of keys) {
          if (row[key] !== undefined && row[key] !== null && String(row[key]).trim()) {
            return String(row[key]).trim();
          }
        }
        return '';
      };
      
      // 检查是否有环境列
      const hasEnvColumn = data.length > 0 && envKeys.some(key => (data[0] as any)[key] !== undefined);
      
      // 优先使用 Excel 中的环境列，否则使用 sheet 名称作为环境
      const defaultEnv = hasEnvColumn ? '' : sheetName;
      
      for (const row of data as any[]) {
        // 获取环境名称（优先使用列值，否则使用 sheet 名称）
        const env = getFieldValue(row, envKeys) || defaultEnv;
        if (env) environments.add(env);
        
        // 获取机柜名称
        const cabinet = getFieldValue(row, cabinetKeys);
        if (cabinet) cabinets.set(cabinet, env || defaultEnv);
        
        // 获取标签
        const tagsStr = getFieldValue(row, tagKeys);
        if (tagsStr) {
          tagsStr.split(/[,，;；|]/).forEach(t => {
            const tag = t.trim();
            if (tag) allTags.add(tag);
          });
        }
      }
      
      // 自动创建/关联环境（包括 sheet 名称作为默认环境）
      for (const envName of environments) {
        const existing = db.prepare('SELECT id FROM environments WHERE name = ?').get(envName);
        if (!existing) {
          try {
            db.prepare('INSERT INTO environments (name) VALUES (?)').run(envName);
            result.environments.created++;
          } catch (e) {
            result.environments.existing++;
          }
        } else {
          result.environments.existing++;
        }
      }
      
      // 自动创建/关联机柜
      for (const [cabinetName, envName] of cabinets) {
        const existing = db.prepare('SELECT id FROM cabinets WHERE name = ?').get(cabinetName);
        if (!existing) {
          try {
            db.prepare('INSERT INTO cabinets (name, environment) VALUES (?, ?)').run(cabinetName, envName);
            result.cabinets.created++;
          } catch (e) {
            result.cabinets.existing++;
          }
        } else {
          result.cabinets.existing++;
        }
      }
      
      // 自动创建/关联标签
      for (const tagName of allTags) {
        if (!tagName) continue;
        const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName);
        if (!existing) {
          try {
            const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(tagName, color);
            result.tags.created++;
          } catch (e) {
            result.tags.existing++;
          }
        } else {
          result.tags.existing++;
        }
      }
      
      // 导入服务器数据
      const insertServer = db.prepare(`
        INSERT INTO servers (name, environment, system_ip, manage_ip, oob_ip, mac_address,
          cabinet, sn, brand, model, cpu, memory, disk, network_card, role, tags, status, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const row of data) {
        const r = row as any;
        
        // 跳过空行（需要至少有一个IP字段）
        const systemIp = r['系统IP'] || r['system_ip'] || r['IP'] || r['ip'] || r['IP Address'] || r['ip_address'];
        if (!systemIp) continue;
        
        // 解析环境名称
        let environment = getFieldValue(r, envKeys) || sheetName || '默认环境';
        
        // 解析机柜名称
        let cabinet = getFieldValue(r, cabinetKeys);
        
        // 解析配置字段
        let cpu = '', memory = '', disk = '';
        const config = getFieldValue(r, ['配置(CPU / 内存 / 磁盘大小、介质 )', '配置', 'config', 'CPU/内存/磁盘', '配置信息']);
        if (config) {
          const cpuMatch = config.match(/(?:CPU|cpu)?\s*[:：]?\s*([^/]+)/);
          const memMatch = config.match(/\/\s*(\d+GB|\d+G)/i);
          const diskMatch = config.match(/\/\s*([^/]+(?:GB|TB))/i);
          
          if (cpuMatch) cpu = cpuMatch[1].trim();
          if (memMatch) memory = memMatch[1].trim();
          if (diskMatch) disk = diskMatch[1].trim();
        }
        
        // 解析标签
        const tagsStr = getFieldValue(r, tagKeys);
        
        // 获取其他字段
        const getOtherField = (keys: string[]) => getFieldValue(r, keys);
        
        try {
          insertServer.run(
            r['角色'] || r['role'] || r['系统IP'] || r['system_ip'] || r['IP'] || systemIp,
            environment,
            systemIp,
            getOtherField(['管理IP', 'manage_ip', 'manageIp', '管理地址']),
            getOtherField(['带外IP', 'oob_ip', 'oobIp', 'BMC_IP', 'bmc_ip', 'iLO', 'iDrac', 'idrac']),
            getOtherField(['mac地址', 'mac', 'MAC', 'mac_address']),
            cabinet,
            getOtherField(['SN号', 'SN', 'sn', 'Serial Number', 'serial_number', '序列号']),
            getOtherField(['品牌', 'brand', 'Brand', '厂商', 'manufacturer']),
            getOtherField(['型号', 'model', 'Model', '规格型号']),
            cpu,
            memory,
            disk,
            getOtherField(['网卡', 'network_card', '网卡信息']),
            getOtherField(['角色', 'role', 'Role', 'server_role', '服务角色']),
            tagsStr,
            getOtherField(['上架状态', 'status', 'Status', '服务器状态']) || '待上架',
            getOtherField(['备注', 'remark', 'Remark', '备注信息']) || ''
          );
          result.imported++;
        } catch (err: any) {
          result.errors.push(`IP ${systemIp}: ${err.message}`);
        }
      }
    });
    
    importTransaction();
    
    // 不自动删除文件，由前端控制或定时清理
    // 文件路径返回给前端供后续操作使用
    
    res.json({ 
      success: true, 
      ...result,
      filePath, // 返回文件路径供全量导入使用
      message: `导入完成：${result.imported} 台服务器，${result.environments.created} 个新环境，${result.cabinets.created} 个新机柜，${result.tags.created} 个新标签`
    });
  } catch (error: any) {
    console.error('导入失败:', error);
    res.status(500).json({ error: '导入失败: ' + error.message });
  }
});

// 解析Excel文件预览
router.post('/preview', (req, res) => {
  const filePath = req.body.filePath;
  
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(400).json({ error: '文件不存在' });
  }
  
  try {
    const workbook = XLSX.readFile(filePath);
    const preview: any = {
      sheets: [],
      totalSheets: workbook.SheetNames.length,
    };
    
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      preview.sheets.push({
        name: sheetName,
        totalRows: data.length,
        columns: data.length > 0 ? Object.keys(data[0] as object) : [],
        sampleData: data.slice(0, 5),
        // 统计可导入的服务器数量
        serverCount: data.filter((row: any) => 
          row['系统IP'] || row['system_ip'] || row['IP']
        ).length,
      });
    }
    
    res.json(preview);
  } catch (error: any) {
    res.status(500).json({ error: '解析失败: ' + error.message });
  }
});

// 删除上传的文件
router.post('/cleanup', (req, res) => {
  const { filePath } = req.body;
  
  if (!filePath) {
    return res.status(400).json({ error: '请提供文件路径' });
  }
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ success: true, message: '文件已删除' });
  } catch (error: any) {
    res.status(500).json({ error: '删除失败: ' + error.message });
  }
});

export default router;
