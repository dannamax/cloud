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
    getTarget: (req) => {
      // 尝试从请求体获取名称/IP，如果没有则标记需要从数据库查询
      const name = req.body?.name || req.body?.system_ip;
      if (name) return name;
      // 保存服务器ID用于后续查询
      (req as any)._auditServerId = req.params?.[0];
      return null; // 稍后会在logAudit中查询
    },
    getDetail: (req) => {
      const changes: string[] = [];
      if (req.body?.name) changes.push('名称');
      if (req.body?.status) changes.push('状态');
      if (req.body?.environment) changes.push('环境');
      if (req.body?.role) changes.push('角色');
      if (req.body?.role_type) changes.push('角色类型');
      if (req.body?.cabinet) changes.push('机柜');
      // 检测是否为SQL批量变更（只有单个字段更新）
      const changeKeys = Object.keys(req.body || {}).filter(k => !['id', 'user_id', 'username'].includes(k));
      if (changeKeys.length === 1 && changes.length === 1) {
        return `SQL变更: ${changes[0]} → ${req.body[changeKeys[0]]}`;
      }
      return changes.length > 0 ? `更新服务器，变更: ${changes.join(', ')}` : `更新服务器`;
    }
  },
  // 角色类型管理
  {
    pattern: /^\/role-types$/,
    targetType: '角色类型',
    action: '创建',
    getTarget: (req) => req.body?.display_name || req.body?.name || '角色类型',
    getDetail: (req) => `创建角色类型: ${req.body?.display_name || '未知'}，标识: ${req.body?.name || '无'}`
  },
  {
    pattern: /^\/role-types\/(\d+)$/,
    targetType: '角色类型',
    action: '更新',
    getTarget: (req) => req.body?.display_name || '角色类型',
    getDetail: (req) => {
      const changes: string[] = [];
      if (req.body?.display_name) changes.push('显示名称');
      if (req.body?.color) changes.push('颜色');
      if (req.body?.description) changes.push('描述');
      if (req.body?.sort_order !== undefined) changes.push('排序');
      return changes.length > 0 ? `更新角色类型，变更: ${changes.join(', ')}` : `更新角色类型`;
    }
  },
  {
    pattern: /^\/role-types\/(\d+)$/,
    targetType: '角色类型',
    action: '删除',
    getTarget: (req) => '角色类型',
    getDetail: () => `删除角色类型`
  },
  // 自定义列管理
  {
    pattern: /^\/custom-columns$/,
    targetType: '自定义列',
    action: '创建',
    getTarget: (req) => req.body?.column_label || req.body?.column_key || '自定义列',
    getDetail: (req) => `创建自定义列: ${req.body?.column_label || '未知'}，标识: ${req.body?.column_key || '无'}`
  },
  {
    pattern: /^\/custom-columns\/(\d+)$/,
    targetType: '自定义列',
    action: '更新',
    getTarget: (req) => req.body?.column_label || '自定义列',
    getDetail: (req) => {
      const changes: string[] = [];
      if (req.body?.column_label) changes.push('显示名称');
      if (req.body?.column_type) changes.push('类型');
      if (req.body?.options) changes.push('选项');
      if (req.body?.sort_order !== undefined) changes.push('排序');
      if (req.body?.visible !== undefined) changes.push('可见性');
      if (req.body?.width !== undefined) changes.push('宽度');
      return changes.length > 0 ? `更新自定义列，变更: ${changes.join(', ')}` : `更新自定义列`;
    }
  },
  {
    pattern: /^\/custom-columns\/(\d+)$/,
    targetType: '自定义列',
    action: '删除',
    getTarget: (req) => '自定义列',
    getDetail: () => `删除自定义列`
  },
  // 标签管理
  {
    pattern: /^\/tags$/,
    targetType: '标签',
    action: '创建',
    getTarget: (req) => req.body?.name || '标签',
    getDetail: (req) => `创建标签: ${req.body?.name || '未知'}`
  },
  {
    pattern: /^\/tags\/(\d+)$/,
    targetType: '标签',
    action: '更新',
    getTarget: (req) => req.body?.name || '标签',
    getDetail: (req) => {
      const changes: string[] = [];
      if (req.body?.name) changes.push('名称');
      if (req.body?.color) changes.push('颜色');
      if (req.body?.description) changes.push('描述');
      return changes.length > 0 ? `更新标签，变更: ${changes.join(', ')}` : `更新标签`;
    }
  },
  {
    pattern: /^\/tags\/(\d+)$/,
    targetType: '标签',
    action: '删除',
    getTarget: (req) => '标签',
    getDetail: () => `删除标签`
  },
  // 机柜管理
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
    getDetail: (req) => {
      const changes: string[] = [];
      if (req.body?.name) changes.push('名称');
      if (req.body?.environment) changes.push('环境');
      if (req.body?.total_u !== undefined) changes.push('总U位');
      if (req.body?.reserved_u !== undefined) changes.push('预留U位');
      if (req.body?.remark !== undefined) changes.push('备注');
      return changes.length > 0 ? `更新机柜，变更: ${changes.join(', ')}` : `更新机柜`;
    }
  },
  {
    pattern: /^\/cabinets\/(\d+)$/,
    targetType: '机柜',
    action: '删除',
    getTarget: (req) => '机柜',
    getDetail: () => `删除机柜`
  },
  // 环境管理
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
    getDetail: (req) => {
      const changes: string[] = [];
      if (req.body?.name) changes.push('名称');
      if (req.body?.code !== undefined) changes.push('编码');
      if (req.body?.description !== undefined) changes.push('描述');
      if (req.body?.sort_order !== undefined) changes.push('排序');
      if (req.body?.status) changes.push('状态');
      if (req.body?.customFields) changes.push('自定义字段');
      return changes.length > 0 ? `更新环境，变更: ${changes.join(', ')}` : `更新环境`;
    }
  },
  {
    pattern: /^\/environments\/(\d+)$/,
    targetType: '环境',
    action: '删除',
    getTarget: (req) => '环境',
    getDetail: () => `删除环境`
  },
  // 用户管理
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
    getDetail: (req) => {
      const changes: string[] = [];
      if (req.body?.username) changes.push('用户名');
      if (req.body?.role) changes.push('角色');
      if (req.body?.status !== undefined) changes.push('状态');
      return changes.length > 0 ? `更新用户，变更: ${changes.join(', ')}` : `更新用户`;
    }
  },
  {
    pattern: /^\/users\/(\d+)\/change-password$/,
    targetType: '用户',
    action: '修改密码',
    getTarget: (req) => '当前用户',
    getDetail: () => '修改账户密码'
  },
  {
    pattern: /^\/users\/(\d+)$/,
    targetType: '用户',
    action: '删除',
    getTarget: (req) => '用户',
    getDetail: () => `删除用户`
  },
  // 设置管理
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
    getDetail: (req) => `更新设置: ${req.params?.[0]}`
  },
  // 数据导入
  {
    pattern: /^\/import\/import$/,
    targetType: '数据',
    action: '导入数据',
    getTarget: () => 'Excel数据导入',
    getDetail: (req) => {
      const result = req.body?.result || {};
      return `导入Excel数据: ${result.imported || 0} 台服务器`;
    }
  },
  {
    pattern: /^\/import\/cleanup$/,
    targetType: '文件',
    action: '清理文件',
    getTarget: () => '上传文件',
    getDetail: () => '清理上传的临时文件'
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
// 注意：审计中间件只处理 POST/PUT/DELETE 请求，所以这些模式只对修改操作生效
// 这些是纯查询类操作，不需要审计
const EXCLUDE_PATTERNS = [
  /^\/audit-logs$/,              // 操作审计日志列表查询
  /^\/audit-logs\/stats$/,       // 审计统计查询
  /^\/change-logs$/,             // 变更历史列表查询
  /^\/change-logs\/stats$/,      // 变更统计
  /^\/versions$/,                // 版本列表查询
  /^\/versions\/latest$/,        // 最新版本查询
  /^\/versions\/\d+$/,           // 版本详情查询
  /^\/versions\/compare$/,      // 版本比较
  /^\/servers\/stats$/,          // 服务器统计
  /^\/servers\/batch\/port-check$/,  // 端口批量检测
  /^\/servers\/\d+\/port-check$/,     // 单个服务器端口检测
  /^\/import\/preview$/,         // Excel预览
  /^\/import\/upload$/,          // 文件上传
  // 注意：/custom-columns 和 /role-types 不在排除列表中
  // 因为它们同时支持 GET 和 POST/PUT/DELETE，需要审计修改操作
  // Express 路由会匹配到具体的路由，如 /custom-columns/\d+ 或 /role-types/\d+
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
      let target = config.getTarget ? config.getTarget(req) : '未知';
      
      // 如果目标是服务器且没有从请求体获取到名称，则从数据库查询
      if (config.targetType === '服务器' && !target) {
        // Express 路由使用命名参数 如 /servers/:id，所以用 req.params.id
        const serverId = (req as any)._auditServerId || req.params?.id;
        if (serverId) {
          const server = db.prepare('SELECT name, system_ip FROM servers WHERE id = ?').get(serverId) as any;
          if (server) {
            target = server.name || server.system_ip || `服务器#${serverId}`;
          }
        }
        if (!target) target = '服务器';
      }
      
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
