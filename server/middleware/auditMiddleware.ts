import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../database.js';

/**
 * API网关审计中间件
 * 自动记录所有修改类操作（POST/PUT/DELETE）到操作审计日志
 */

// 操作类型映射
const METHOD_ACTION_MAP: Record<string, string> = {
  POST: '创建',
  PUT: '更新',
  DELETE: '删除',
};

// 路由到目标类型的映射（按路径长度降序排列，确保更具体的路由优先匹配）
// 注意：Express 中间件的 req.path 不包含挂载点前缀
const ROUTE_CONFIG_LIST: Array<{
  pattern: RegExp;
  targetType: string;
  action?: string;
  getTarget?: (req: Request) => string;
  getDetail?: (req: Request, targetType: string, action: string) => string;
}> = [
  // 具体的业务路由优先匹配（不带 /api 前缀）
  {
    pattern: /^\/servers\/(\d+)\/change$/,
    targetType: '服务器',
    action: '标记异动',
    getTarget: (req) => req.body?.server_name || req.body?.name || '服务器',
    getDetail: (req) => {
      const { change_type, after_status, remark, before_status } = req.body;
      return `服务器异动标注: ${before_status || '未知'} → ${after_status}，变更类型: ${change_type}${remark ? `，备注: ${remark}` : ''}`;
    }
  },
  {
    pattern: /^\/servers\/batch\/status$/,
    targetType: '服务器',
    action: '批量更新',
    getTarget: (req) => `批量更新 ${Array.isArray(req.body?.ids) ? req.body.ids.length : 0} 台服务器`,
    getDetail: (req) => `批量更新 ${Array.isArray(req.body?.ids) ? req.body.ids.length : 0} 台服务器状态为: ${req.body?.status}`
  },
  {
    pattern: /^\/servers\/batch\/delete$/,
    targetType: '服务器',
    action: '批量删除',
    getTarget: (req) => `批量删除 ${Array.isArray(req.body?.ids) ? req.body.ids.length : 0} 台服务器`,
    getDetail: (req) => `批量删除 ${Array.isArray(req.body?.ids) ? req.body.ids.length : 0} 台服务器`
  },
  {
    pattern: /^\/servers$/,
    targetType: '服务器',
    action: '创建',
    getTarget: (req) => req.body?.name || req.body?.system_ip || '服务器',
    getDetail: (req) => `创建服务器: ${req.body?.name || '未知'}，IP: ${req.body?.system_ip || '无'}`
  },
  {
    pattern: /^\/servers\/(\d+)$/,
    targetType: '服务器',
    action: '更新',
    getTarget: (req) => req.body?.name || req.body?.system_ip || '服务器',
    getDetail: (req) => {
      const changes: string[] = [];
      if (req.body?.name) changes.push('名称');
      if (req.body?.status) changes.push('状态');
      if (req.body?.environment) changes.push('环境');
      return changes.length > 0 ? `更新服务器，变更: ${changes.join(', ')}` : `更新服务器`;
    }
  },
  {
    pattern: /^\/cabinets\/sync-with-servers$/,
    targetType: '机柜',
    action: '同步机柜',
    getTarget: () => '从服务器数据同步',
    getDetail: () => '同步机柜: 从服务器数据同步'
  },
  {
    pattern: /^\/cabinets$/,
    targetType: '机柜',
    action: '创建',
    getTarget: (req) => req.body?.name || '机柜',
    getDetail: (req) => `创建机柜: ${req.body?.name}，环境: ${req.body?.environment || '未指定'}`
  },
  {
    pattern: /^\/cabinets\/(\d+)$/,
    targetType: '机柜',
    action: '更新',
    getTarget: (req) => req.body?.name || '机柜',
  },
  {
    pattern: /^\/environments\/sync$/,
    targetType: '环境',
    action: '同步环境',
    getTarget: () => '从服务器数据同步',
    getDetail: () => '同步环境: 从服务器数据同步'
  },
  {
    pattern: /^\/environments$/,
    targetType: '环境',
    action: '创建',
    getTarget: (req) => req.body?.name || '环境',
    getDetail: (req) => `创建环境: ${req.body?.name}`
  },
  {
    pattern: /^\/environments\/(\d+)$/,
    targetType: '环境',
    action: '更新',
    getTarget: (req) => req.body?.name || '环境',
  },
  {
    pattern: /^\/tags$/,
    targetType: '标签',
    action: '创建',
    getTarget: (req) => req.body?.name || '标签',
    getDetail: (req) => `创建标签: ${req.body?.name}`
  },
  {
    pattern: /^\/tags\/(\d+)$/,
    targetType: '标签',
    action: '更新',
    getTarget: (req) => req.body?.name || '标签',
  },
  {
    pattern: /^\/users\/login$/,
    targetType: '认证',
    action: '登录',
    getTarget: () => '系统',
    getDetail: () => '用户登录系统'
  },
  {
    pattern: /^\/users$/,
    targetType: '用户',
    action: '创建',
    getTarget: (req) => req.body?.username || '用户',
    getDetail: (req) => `创建用户: ${req.body?.username}，角色: ${req.body?.role || 'operator'}`
  },
  {
    pattern: /^\/users\/(\d+)$/,
    targetType: '用户',
    action: '更新',
    getTarget: (req) => req.body?.username || '用户',
  },
  {
    pattern: /^\/users\/(\d+)\/change-password$/,
    targetType: '用户',
    action: '修改密码',
    getTarget: (req) => '当前用户',
    getDetail: () => '修改账户密码'
  },
  {
    pattern: /^\/settings\/clear$/,
    targetType: '数据',
    action: '清空数据',
    getTarget: (req) => `清空${req.body?.type === 'servers' ? '服务器' : '日志'}数据`,
    getDetail: (req) => `清空${req.body?.type === 'servers' ? '服务器' : '日志'}数据`
  },
  {
    pattern: /^\/settings\/(\w+)$/,
    targetType: '设置',
    action: '更新',
    getTarget: (req) => req.params?.[0] || '设置',
  },
  {
    pattern: /^\/import\/import$/,
    targetType: '数据',
    action: '导入数据',
    getTarget: () => 'Excel数据导入',
    getDetail: () => '导入Excel数据'
  },
  // 版本管理
  {
    pattern: /^\/versions\/snapshot$/,
    targetType: '版本',
    action: '创建快照',
    getTarget: () => '数据快照',
    getDetail: (req) => `创建${req.body?.data_type === 'all' ? '全量' : req.body?.data_type || '全量'}数据快照，描述: ${req.body?.description || '无'}`
  },
  {
    pattern: /^\/versions\/(\d+)\/rollback$/,
    targetType: '版本',
    action: '版本回退',
    getTarget: (req) => `v${req.params?.[0]}`,
    getDetail: (req) => `回退数据到版本 v${req.params?.[0]}`
  },
];

// 排除的路径模式（不需要审计 - 白名单机制）
const EXCLUDE_PATTERNS = [
  /^\/api\/audit-logs/,
  /^\/api\/change-logs/,
  /^\/api\/versions$/,           // 版本列表查询
  /^\/api\/versions\/latest$/,  // 最新版本查询
  /^\/api\/versions\/\d+$/,    // 版本详情查询
  /^\/api\/versions\/compare$/, // 版本比较
  /^\/api\/servers\/stats$/,
  /^\/api\/servers\/batch\/port-check$/,
  /^\/api\/servers\/\d+\/port-check$/,  // 服务器端口检测接口
  /^\/api\/import\/preview$/,
];

/**
 * 审计中间件
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  // 只审计修改类请求
  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return next();
  }
  
  const path = req.path;
  
  // 检查是否排除
  if (EXCLUDE_PATTERNS.some(pattern => pattern.test(path))) {
    return next();
  }
  
  // 查找匹配的路由配置
  const config = ROUTE_CONFIG_LIST.find(item => item.pattern.test(path));
  
  // 如果没有配置，直接跳过
  if (!config) {
    return next();
  }
  
  // 保存原始响应方法
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  
  // 标记是否已记录
  let logged = false;
  
  // 通用日志记录函数
  const logAudit = () => {
    if (logged) return;
    logged = true;
    
    try {
      const db = getDatabase();
      
      const action = config.action || `${METHOD_ACTION_MAP[req.method] || req.method}${config.targetType}`;
      const target = config.getTarget ? config.getTarget(req) : '未知';
      const detail = config.getDetail ? config.getDetail(req, config.targetType, action) : `${action}${config.targetType}: ${target}`;
      
      // 获取用户信息
      const username = req.body?.operator || 
                      req.headers['x-username'] as string || 
                      req.body?.username ||
                      'system';
      
      db.prepare(`
        INSERT INTO operation_logs (user_id, username, action, target, target_type, detail, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.body?.user_id || null,
        username,
        action,
        target,
        config.targetType,
        detail,
        req.ip || req.socket.remoteAddress || 'unknown'
      );
        
      } catch (error) {
        console.error('[审计] 记录审计日志失败:', error);
      }
  };
  
  // 重写 json 方法
  res.json = function(body: any) {
    // 只在成功响应时记录
    if (res.statusCode >= 200 && res.statusCode < 300) {
      logAudit();
    }
    return originalJson(body);
  };
  
  // 重写 send 方法（某些路由可能用 send）
  res.send = function(body: any) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      logAudit();
    }
    return originalSend(body);
  };
  
  // 也监听 finish 事件作为保底
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300 && !logged) {
      logAudit();
    }
  });
  
  next();
}

export default auditMiddleware;
