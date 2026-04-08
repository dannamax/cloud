import axios from 'axios';
import type { Server, ServerStats, ChangeLog, User, LoginResponse, Settings, Cabinet, Environment, Tag, AuditLog, AuditLogStats, AuditLogResponse } from '../types';

const API_BASE = '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// 服务器API
export const serverApi = {
  getAll: (params?: {
    environment?: string;
    status?: string;
    role?: string;
    cabinet?: string;
    keyword?: string;
  }) => axios.get<Server[]>(`${API_BASE}/servers`, { params }).then(r => r.data),
  
  getById: (id: number) => axios.get<Server>(`${API_BASE}/servers/${id}`).then(r => r.data),
  
  getStats: () => axios.get<ServerStats>(`${API_BASE}/servers/stats`).then(r => r.data),
  
  create: (data: Partial<Server>) => axios.post<Server>(`${API_BASE}/servers`, data).then(r => r.data),
  
  update: (id: number, data: Partial<Server>) => 
    axios.put<Server>(`${API_BASE}/servers/${id}`, data).then(r => r.data),
  
  delete: (id: number) => axios.delete(`${API_BASE}/servers/${id}`).then(r => r.data),
  
  changeStatus: (id: number, data: {
    change_type: string;
    after_status: string;
    operator?: string;
    remark?: string;
  }) => axios.post<Server>(`${API_BASE}/servers/${id}/change`, data).then(r => r.data),
  
  batchUpdateStatus: (ids: number[], status: string) => 
    axios.post(`${API_BASE}/servers/batch/status`, { ids, status }).then(r => r.data),

  // 批量删除服务器
  batchDelete: (ids: number[]) =>
    axios.post<{ success: boolean; deleted: number; message: string }>(`${API_BASE}/servers/batch/delete`, { ids }).then(r => r.data),

  // 端口检测单个服务器
  portCheck: (id: number) => axios.post<{ success: boolean; online: boolean; ip: string }>(`${API_BASE}/servers/${id}/port-check`).then(r => r.data),

  // 批量端口检测（支持环境过滤）
  batchPortCheck: (environment?: string) => axios.post<{ 
    success: boolean; 
    results: any[]; 
    total: number; 
    online: number; 
    offline: number 
  }>(`${API_BASE}/servers/batch/port-check`, { environment }).then(r => r.data),
};

// 变更日志API
export const changeLogApi = {
  getAll: (params?: {
    server_id?: number;
    change_type?: string;
    start_date?: string;
    end_date?: string;
    keyword?: string;
  }) => axios.get<ChangeLog[]>(`${API_BASE}/change-logs`, { params }).then(r => r.data),
  
  getByServer: (serverId: number) => 
    axios.get<ChangeLog[]>(`${API_BASE}/change-logs/server/${serverId}`).then(r => r.data),
  
  getStats: () => axios.get(`${API_BASE}/change-logs/stats`).then(r => r.data),
};

// 用户API
export const userApi = {
  login: (username: string, password: string) => 
    axios.post<LoginResponse>(`${API_BASE}/users/login`, { username, password }).then(r => r.data),
  
  me: () => axios.get<User>(`${API_BASE}/users/me`, { headers: getAuthHeaders() }).then(r => r.data),
  
  getAll: () => axios.get<User[]>(`${API_BASE}/users`).then(r => r.data),
  
  create: (data: { username: string; password: string; display_name?: string; role?: string }) =>
    axios.post<User>(`${API_BASE}/users`, data).then(r => r.data),
  
  update: (id: number, data: Partial<User> & { password?: string }) =>
    axios.put<User>(`${API_BASE}/users/${id}`, data).then(r => r.data),
  
  delete: (id: number) => axios.delete(`${API_BASE}/users/${id}`).then(r => r.data),

  // 修改密码
  changePassword: (id: number, oldPassword: string, newPassword: string) =>
    axios.post(`${API_BASE}/users/${id}/change-password`, { oldPassword, newPassword }).then(r => r.data),
};

// 设置API
export const settingsApi = {
  getAll: () => axios.get<Settings[]>(`${API_BASE}/settings`).then(r => r.data),

  // 获取单个设置
  get: (key: string) =>
    axios.get<Settings>(`${API_BASE}/settings/${key}`).then(r => r.data),

  // 更新设置
  update: (key: string, value: string) =>
    axios.put<Settings>(`${API_BASE}/settings/${key}`, { value }).then(r => r.data),

  export: () => axios.get(`${API_BASE}/settings/export`).then(r => r.data),

  clear: (type: 'servers' | 'logs') =>
    axios.delete(`${API_BASE}/settings/clear`, { data: { type } }).then(r => r.data),
};

// 导入API
export const importApi = {
  // 上传Excel文件
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post<{ success: boolean; filePath: string; filename: string }>(
      `${API_BASE}/import/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then(r => r.data);
  },
  
  // 预览Excel内容
  preview: (filePath: string) =>
    axios.post<{
      sheets: Array<{
        name: string;
        totalRows: number;
        columns: string[];
        sampleData: any[];
        serverCount: number;
      }>;
      totalSheets: number;
    }>(`${API_BASE}/import/preview`, { filePath }).then(r => r.data),
  
  // 执行导入
  importExcel: (filePath: string, sheetIndex: number = 0) =>
    axios.post<{ 
      success: boolean; 
      imported: number;
      filePath?: string;
      environments: { created: number; existing: number };
      cabinets: { created: number; existing: number };
      tags: { created: number; existing: number };
      errors: string[];
      message: string;
    }>(`${API_BASE}/import/import`, { filePath, sheetIndex }).then(r => r.data),
  
  // 清理上传文件
  cleanup: (filePath: string) =>
    axios.post(`${API_BASE}/import/cleanup`, { filePath }).then(r => r.data),
};

// 机柜配置API
export const cabinetApi = {
  getAll: (params?: { environment?: string; keyword?: string }) =>
    axios.get<Cabinet[]>(`${API_BASE}/cabinets`, { params }).then(r => r.data),
  
  getById: (id: number) =>
    axios.get<Cabinet>(`${API_BASE}/cabinets/${id}`).then(r => r.data),
  
  create: (data: Partial<Cabinet>) =>
    axios.post<Cabinet>(`${API_BASE}/cabinets`, data).then(r => r.data),
  
  update: (id: number, data: Partial<Cabinet>) =>
    axios.put<Cabinet>(`${API_BASE}/cabinets/${id}`, data).then(r => r.data),
  
  delete: (id: number) =>
    axios.delete(`${API_BASE}/cabinets/${id}`).then(r => r.data),
  
  syncWithServers: () =>
    axios.post<{ success: boolean; added: number; updated: number; total: number; message: string }>(`${API_BASE}/cabinets/sync-with-servers`).then(r => r.data),
};

// 环境配置API
export const environmentApi = {
  getAll: (params?: { status?: string; keyword?: string }) =>
    axios.get<Environment[]>(`${API_BASE}/environments`, { params }).then(r => r.data),

  getById: (id: number) =>
    axios.get<Environment>(`${API_BASE}/environments/${id}`).then(r => r.data),

  create: (data: Partial<Environment>) =>
    axios.post<Environment>(`${API_BASE}/environments`, data).then(r => r.data),

  update: (id: number, data: Partial<Environment>) =>
    axios.put<Environment>(`${API_BASE}/environments/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    axios.delete(`${API_BASE}/environments/${id}`).then(r => r.data),

  sync: () =>
    axios.post<{ success: boolean; added: number; total: number; message: string }>(`${API_BASE}/environments/sync`).then(r => r.data),
};

// 自定义列API
export interface CustomColumn {
  id: number;
  page_type: string;
  column_key: string;
  column_label: string;
  column_type: string;
  options: string[];
  sort_order: number;
  visible: boolean;
  width: number;
  editable: boolean;
  required: boolean;
}

export const customColumnApi = {
  getAll: (pageType?: string) =>
    axios.get<CustomColumn[]>(`${API_BASE}/custom-columns`, { params: { page_type: pageType } }).then(r => r.data),

  create: (data: Partial<CustomColumn>) =>
    axios.post<CustomColumn>(`${API_BASE}/custom-columns`, data).then(r => r.data),

  update: (id: number, data: Partial<CustomColumn>) =>
    axios.put<CustomColumn>(`${API_BASE}/custom-columns/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    axios.delete(`${API_BASE}/custom-columns/${id}`).then(r => r.data),
};

// 标签API
export const tagsApi = {
  getAll: (params?: { keyword?: string }) =>
    axios.get<Tag[]>(`${API_BASE}/tags`, { params }).then(r => r.data),

  getById: (id: number) =>
    axios.get<Tag>(`${API_BASE}/tags/${id}`).then(r => r.data),

  create: (data: Partial<Tag>) =>
    axios.post<Tag>(`${API_BASE}/tags`, data).then(r => r.data),

  update: (id: number, data: Partial<Tag>) =>
    axios.put<Tag>(`${API_BASE}/tags/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    axios.delete(`${API_BASE}/tags/${id}`).then(r => r.data),
};

// 审计日志API
export const auditLogApi = {
  getAll: (params?: {
    username?: string;
    action?: string;
    target_type?: string;
    start_date?: string;
    end_date?: string;
    keyword?: string;
    page?: number;
    page_size?: number;
  }) => axios.get<AuditLogResponse>(`${API_BASE}/audit-logs`, { params }).then(r => r.data),

  getStats: () => axios.get<AuditLogStats>(`${API_BASE}/audit-logs/stats`).then(r => r.data),

  getActions: () => axios.get<string[]>(`${API_BASE}/audit-logs/actions`).then(r => r.data),

  getTargetTypes: () => axios.get<string[]>(`${API_BASE}/audit-logs/target-types`).then(r => r.data),

  getById: (id: number) => axios.get<AuditLog>(`${API_BASE}/audit-logs/${id}`).then(r => r.data),

  create: (data: {
    user_id?: number;
    username: string;
    action: string;
    target?: string;
    target_type?: string;
    detail?: string;
    ip_address?: string;
  }) => axios.post<AuditLog>(`${API_BASE}/audit-logs`, data).then(r => r.data),
};

// 版本管理API
export const versionApi = {
  // 获取版本列表
  getAll: (params?: {
    data_type?: string;
    limit?: number;
    offset?: number;
  }) => axios.get<{ success: boolean; data: any[]; total: number }>(`${API_BASE}/versions`, { params }).then(r => r.data),

  // 获取最新版本号
  getLatest: () => axios.get<{ success: boolean; latestVersion: number }>(`${API_BASE}/versions/latest`).then(r => r.data),

  // 获取指定版本详情
  getById: (versionNumber: number) =>
    axios.get<{ success: boolean; data: any }>(`${API_BASE}/versions/${versionNumber}`).then(r => r.data),

  // 创建快照
  createSnapshot: (data: {
    data_type?: string;
    description?: string;
    operator?: string;
  }) => axios.post<{ success: boolean; message: string; versionNumber: number }>(`${API_BASE}/versions/snapshot`, data).then(r => r.data),

  // 回退到指定版本
  rollback: (versionNumber: number, operator?: string) =>
    axios.post<{ success: boolean; message: string; restoredData: any }>(
      `${API_BASE}/versions/${versionNumber}/rollback`,
      { operator }
    ).then(r => r.data),

  // 比较两个版本
  compare: (from: number, to: number) =>
    axios.get<{ success: boolean; from: any; to: any; diff: any }>(`${API_BASE}/versions/compare`, {
      params: { from, to }
    }).then(r => r.data),
};
