import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  RefreshCw,
  MoreVertical,
  Edit,
  Trash2,
  ArrowUpDown,
  Download,
  Server as ServerIcon,
  Layers,
  HardDrive,
  Building2,
  Activity,
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle,
  AlertTriangle,
  Settings2,
  GripVertical,
  Eye,
  EyeOff,
  Terminal,
  History,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { serverApi, importApi } from '../services/api';
import type { Server, ServerStats } from '../types';
import { useAppStore } from '../stores/appStore';

const statusColors: Record<string, string> = {
  '已上架': 'bg-status-online/20 text-status-online',
  '待上架': 'bg-slate-500/20 text-slate-400',
  '异动中': 'bg-status-warning/20 text-status-warning',
  '异动回': 'bg-purple-500/20 text-purple-400',
};

const onlineStatusColors: Record<string, string> = {
  'online': 'bg-status-online',
  'offline': 'bg-status-offline',
  'unknown': 'bg-slate-500',
};

// 表格列定义
interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
}

// 筛选状态类型
interface FilterState {
  environment: string;
  status: string;
  role: string;
  cabinet: string;
  keyword: string;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'checkbox', label: '选择', visible: true, width: 'w-12' },
  { key: 'index', label: '序号', visible: true, width: 'w-16' },
  { key: 'status', label: '状态', visible: true, width: 'w-28' },
  { key: 'system_ip', label: 'IP地址', visible: true, width: 'w-32' },
  { key: 'name', label: '主机名', visible: true, width: 'w-32' },
  { key: 'role_type', label: '角色类型', visible: true, width: 'w-28' },
  { key: 'role', label: '角色', visible: true, width: 'w-24' },
  { key: 'environment', label: '环境', visible: true, width: 'w-28' },
  { key: 'cabinet', label: '机柜', visible: true, width: 'w-32' },
  { key: 'brand', label: '品牌', visible: true, width: 'w-24' },
  { key: 'model', label: '型号', visible: false, width: 'w-24' },
  { key: 'sn', label: 'SN号', visible: false, width: 'w-32' },
  { key: 'manage_ip', label: '管理IP', visible: false, width: 'w-32' },
  { key: 'oob_ip', label: '带外IP', visible: false, width: 'w-32' },
  { key: 'cpu', label: 'CPU', visible: false, width: 'w-24' },
  { key: 'memory', label: '内存', visible: false, width: 'w-20' },
  { key: 'disk', label: '磁盘', visible: false, width: 'w-20' },
  { key: 'network_card', label: '网卡', visible: false, width: 'w-24' },
  { key: 'tags', label: '标签', visible: false, width: 'w-28' },
  { key: 'remark', label: '备注', visible: false, width: 'w-32' },
  { key: 'actions', label: '操作', visible: true, width: 'w-20' },
];

const STORAGE_KEY = 'server_table_columns';
const SQL_HISTORY_KEY = 'sql_edit_history';

// SQL 变更历史记录
interface SqlHistoryItem {
  id: string;
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  count: number;
  sql: string;
  whereConditions: string;
  reverted?: boolean;
}

// 加载 SQL 历史记录
function loadSqlHistory(): SqlHistoryItem[] {
  try {
    const saved = localStorage.getItem(SQL_HISTORY_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}
  return [];
}

// 保存 SQL 历史记录
function saveSqlHistory(history: SqlHistoryItem[]) {
  try {
    localStorage.setItem(SQL_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {}
}

// 加载保存的列配置
function loadColumnConfig(): ColumnConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const savedConfig = JSON.parse(saved);
      return DEFAULT_COLUMNS.map(col => {
        const savedCol = savedConfig.find((c: any) => c.key === col.key);
        return savedCol ? { ...col, visible: savedCol.visible } : col;
      });
    }
  } catch (e) {}
  return DEFAULT_COLUMNS;
}

// 保存列配置
function saveColumnConfig(config: ColumnConfig[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {}
}

export function ServersPage() {
  const { servers, setServers, serverStats, setServerStats } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [batchEditSql, setBatchEditSql] = useState('');
  const [batchEditPreview, setBatchEditPreview] = useState<{field: string; value: string; count: number}[]>([]);
  const [columns, setColumns] = useState<ColumnConfig[]>(loadColumnConfig);
  const [sqlHistory, setSqlHistory] = useState<SqlHistoryItem[]>(loadSqlHistory);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // 添加到历史记录
  const addToHistory = (field: string, oldValue: string, newValue: string, count: number, sql: string, whereConditions: string) => {
    const newHistory: SqlHistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('zh-CN'),
      field,
      oldValue,
      newValue,
      count,
      sql,
      whereConditions,
      reverted: false
    };
    const updatedHistory = [newHistory, ...sqlHistory].slice(0, 50); // 最多保留50条
    setSqlHistory(updatedHistory);
    saveSqlHistory(updatedHistory);
  };

  // 回退到指定版本
  const revertToVersion = async (historyItem: SqlHistoryItem) => {
    if (historyItem.reverted) {
      alert('该版本已回退过，请勿重复操作');
      return;
    }

    const whereStr = historyItem.whereConditions || '无条件';
    if (!confirm(`确定要回退到以下变更吗？\n\n字段: ${historyItem.field}\n原值: ${historyItem.oldValue}\n目标值: ${historyItem.newValue}\n影响: ${historyItem.count} 台服务器\n条件: ${whereStr}\n\n执行反向操作（将值改回原值）`)) {
      return;
    }

    try {
      // 获取当前所有服务器并筛选符合条件的
      const serversRes = await serverApi.getAll({});
      const matchedServers = serversRes.filter((server: Server) => {
        const serverValue = (server as any)[historyItem.field];
        return String(serverValue || '').toLowerCase() === historyItem.newValue.toLowerCase();
      });

      if (matchedServers.length === 0) {
        alert('没有找到符合条件的服务器，可能数据已变更');
        return;
      }

      // 逐个恢复原值
      const updatePromises = matchedServers.map(server =>
        serverApi.update(server.id, { [historyItem.field]: historyItem.oldValue })
      );
      await Promise.all(updatePromises);

      // 标记原记录为已回退
      const updatedHistory = sqlHistory.map(item =>
        item.id === historyItem.id ? { ...item, reverted: true } : item
      );
      setSqlHistory(updatedHistory);
      saveSqlHistory(updatedHistory);

      // 添加回退记录到历史
      addToHistory(
        historyItem.field,
        historyItem.newValue,
        historyItem.oldValue,
        matchedServers.length,
        `SET ${historyItem.field} = '${historyItem.oldValue}'`,
        historyItem.whereConditions || ''
      );

      alert(`已成功回退 ${matchedServers.length} 台服务器的 ${historyItem.field} 字段`);
      fetchServers();
    } catch (error) {
      console.error('回退失败:', error);
      alert('回退操作失败');
    }
  };

  // 切换列显示
  const toggleColumn = (key: string) => {
    const newColumns = columns.map(col => 
      col.key === key ? { ...col, visible: !col.visible } : col
    );
    setColumns(newColumns);
    saveColumnConfig(newColumns);
  };

  // 重置为默认
  const resetColumns = () => {
    setColumns(DEFAULT_COLUMNS);
    saveColumnConfig(DEFAULT_COLUMNS);
  };

  // 可见列
  const visibleColumns = columns.filter(col => col.visible);

  // 从 URL 参数获取 filters
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasUrlParams = searchParams.toString().length > 0;

  // 提取 URL 参数
  const urlStatus = searchParams.get('status') || '';
  const urlEnvironment = searchParams.get('environment') || '';
  const urlRole = searchParams.get('role') || '';

  // 内部 filters 状态（仅在非 URL 模式时使用）
  const [internalFilters, setInternalFilters] = useState({
    environment: '',
    status: '',
    role: '',
    cabinet: '',
    keyword: '',
  });

  // 如果有 URL 参数，使用 URL 参数；否则使用内部状态
  const filters = hasUrlParams
    ? { environment: urlEnvironment, status: urlStatus, role: urlRole, cabinet: '', keyword: '' }
    : internalFilters;

  // 设置 filters 的包装函数（手动设置时清除 URL 参数）
  const setFilters = useCallback((updater: any) => {
    setSearchParams({}); // 清除 URL 参数
    setInternalFilters((prev: typeof internalFilters) => typeof updater === 'function' ? updater(prev) : updater);
  }, [setSearchParams]);

  // 使用 useCallback 确保 fetchServers 总是使用最新的 filters
  const fetchServers = useCallback(async () => {
    setLoading(true);
    try {
      // 直接从 URL 参数获取最新的过滤条件
      const urlParams = {
        environment: searchParams.get('environment') || '',
        status: searchParams.get('status') || '',
        role: searchParams.get('role') || '',
        cabinet: searchParams.get('cabinet') || '',
        keyword: ''
      };
      const [data, statsData] = await Promise.all([
        serverApi.getAll(urlParams),
        serverApi.getStats()
      ]);
      setServers(data);
      setStats(statsData);
      setServerStats(statsData);
    } catch (error) {
      console.error('获取服务器失败:', error);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // 当 URL 参数变化时，获取服务器
  useEffect(() => {
    fetchServers();
  }, [searchParams, fetchServers]);

  // 内部 filters 变化时获取服务器（仅在没有 URL 参数时）
  useEffect(() => {
    if (!hasUrlParams) {
      fetchServers();
    }
  }, [internalFilters, hasUrlParams, fetchServers]);

  const environments = useMemo(() => 
    stats?.byEnvironment?.map(e => e.environment) || [], 
    [stats]
  );

  const roles = useMemo(() => 
    stats?.byRole?.map(r => r.role) || [], 
    [stats]
  );

  // 分类统计数据
  const categoryStats = useMemo(() => {
    if (!stats) return null;
    return {
      total: stats.total,
      online: stats.online,
      offline: stats.offline,
      inTransit: stats.inTransit,
      environments: stats.byEnvironment || [],
      roles: stats.byRole || [],
      cabinets: stats.byCabinet || [],
    };
  }, [stats]);

  const handleCategoryClick = (type: 'environment' | 'role' | 'status', value: string) => {
    const newParams = new URLSearchParams(searchParams);
    const currentValue = newParams.get(type) || '';
    
    // 切换：如果已选中则取消，否则选中
    if (currentValue === value) {
      newParams.delete(type);
    } else {
      newParams.set(type, value);
    }
    
    setSearchParams(newParams);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === servers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(servers.map(s => s.id));
    }
  };

  const handleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleBatchStatus = async (status: string) => {
    if (selectedIds.length === 0) return;
    try {
      await serverApi.batchUpdateStatus(selectedIds, status);
      fetchServers();
      setSelectedIds([]);
    } catch (error) {
      console.error('批量操作失败:', error);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 台服务器吗？此操作不可恢复。`)) return;
    try {
      await serverApi.batchDelete(selectedIds);
      fetchServers();
      setSelectedIds([]);
    } catch (error) {
      console.error('批量删除失败:', error);
    }
  };

  // 解析 SQL 风格的批量编辑语句
  const parseBatchEditSql = (sql: string, selectedServers: Server[]) => {
    const trimmed = sql.trim().toUpperCase();
    if (!trimmed.startsWith('UPDATE') && !trimmed.startsWith('SET')) {
      return { error: '语句必须以 UPDATE 或 SET 开头' };
    }

    // 提取 SET 部分: SET field = 'value' 或 SET field = "value"
    const setMatch = trimmed.match(/SET\s+(\w+)\s*=\s*['"]([^'"]*)['"]/);
    if (!setMatch) {
      return { error: '请使用正确的格式: SET field = \'value\'' };
    }

    const field = setMatch[1].toLowerCase();
    const value = setMatch[2];

    // 验证字段是否可编辑
    const editableFields = ['name', 'environment', 'role', 'role_type', 'tags', 'remark', 'status', 'cabinet', 'u_position', 'sn', 'brand', 'model', 'cpu', 'memory', 'disk'];
    if (!editableFields.includes(field)) {
      return { error: `字段 "${field}" 不可编辑。可编辑字段: ${editableFields.join(', ')}` };
    }

    // 提取 WHERE 条件
    const whereConditions: { field: string; value: string }[] = [];
    const whereMatch = trimmed.match(/WHERE\s+(.+?)(?:;|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1].toLowerCase();
      // 解析 AND 条件
      const andParts = whereClause.split(/\s+and\s+/);
      for (const part of andParts) {
        const condMatch = part.match(/(\w+)\s*=\s*['"]([^'"]*)['"]/);
        if (condMatch) {
          whereConditions.push({ field: condMatch[1].toLowerCase(), value: condMatch[2] });
        }
      }
    }

    // 筛选符合条件且被选中的服务器
    let matchedServers = selectedServers;
    if (whereConditions.length > 0) {
      matchedServers = selectedServers.filter(server => {
        return whereConditions.every(cond => {
          const serverValue = (server as any)[cond.field];
          return String(serverValue || '').toLowerCase() === cond.value.toLowerCase();
        });
      });
    }

    return {
      field,
      value,
      count: matchedServers.length,
      servers: matchedServers
    };
  };

  // 预览 SQL 执行效果
  const handleSqlPreview = () => {
    if (!batchEditSql.trim()) {
      setBatchEditPreview([]);
      return;
    }
    const result = parseBatchEditSql(batchEditSql, servers);
    if ('error' in result) {
      setBatchEditPreview([{ field: (result as any).error || '未知错误', value: '', count: 0 }]);
    } else {
      setBatchEditPreview([{ field: result.field, value: result.value, count: result.count }]);
    }
  };

  // 执行批量编辑
  const handleBatchEdit = async () => {
    if (!batchEditSql.trim() || selectedIds.length === 0) return;

    const selectedServers = servers.filter(s => selectedIds.includes(s.id));
    const result = parseBatchEditSql(batchEditSql, selectedServers);

    if ('error' in result) {
      alert(result.error);
      return;
    }

    if (!confirm(`确定要将 ${result.count} 台服务器的 "${result.field}" 字段修改为 "${result.value}" 吗？`)) {
      return;
    }

    try {
      // 记录变更前的值
      const oldValuesMap = new Map<number, string>();
      result.servers.forEach(server => {
        oldValuesMap.set(server.id, (server as any)[result.field] || '');
      });

      // 逐个更新服务器
      const updatePromises = result.servers.map(server =>
        serverApi.update(server.id, { [result.field]: result.value })
      );
      await Promise.all(updatePromises);

      // 提取 WHERE 条件用于历史记录
      const whereMatch = batchEditSql.trim().match(/WHERE\s+(.+?)(?:;|$)/i);
      const whereConditions = whereMatch ? whereMatch[1] : '';

      // 保存到历史记录（只记录第一条的原值作为代表）
      if (result.servers.length > 0) {
        const firstServerOldValue = oldValuesMap.get(result.servers[0].id) || '';
        addToHistory(
          result.field,
          firstServerOldValue,
          result.value,
          result.count,
          batchEditSql.trim(),
          whereConditions
        );
      }

      setShowBatchEditModal(false);
      setBatchEditSql('');
      setBatchEditPreview([]);
      setSelectedIds([]);
      fetchServers();
    } catch (error) {
      console.error('批量编辑失败:', error);
      alert('批量编辑失败');
    }
  };

  return (
    <div className="space-y-4">
      {/* 分类统计展示区域 */}
      {categoryStats && (
        <div className="space-y-4">
          {/* 概览统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div 
              onClick={() => setSearchParams({})}
              className="bg-background-card border border-background-border rounded-xl p-4 hover:border-primary/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <ServerIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">服务器总数</p>
                  <p className="text-2xl font-bold text-white">{categoryStats.total}</p>
                </div>
              </div>
            </div>
            <div 
              onClick={() => setSearchParams({ status: 'online' })}
              className="bg-background-card border border-background-border rounded-xl p-4 hover:border-status-online/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-status-online/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-status-online" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">在线</p>
                  <p className="text-2xl font-bold text-status-online">{categoryStats.online}</p>
                </div>
              </div>
            </div>
            <div 
              onClick={() => setSearchParams({ status: 'offline' })}
              className="bg-background-card border border-background-border rounded-xl p-4 hover:border-status-offline/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-status-offline/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-status-offline" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">离线</p>
                  <p className="text-2xl font-bold text-status-offline">{categoryStats.offline}</p>
                </div>
              </div>
            </div>
            <div 
              onClick={() => handleCategoryClick('status', '异动中')}
              className="bg-background-card border border-background-border rounded-xl p-4 hover:border-status-warning/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-status-warning/20 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-status-warning" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">异动中</p>
                  <p className="text-2xl font-bold text-status-warning">{categoryStats.inTransit}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 分类按钮紧凑横向排列 */}
          <div className="flex flex-col gap-3">
            {/* 按环境分类 - 紧凑横向 */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-shrink-0 w-24">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-slate-300">环境</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1">
                {categoryStats.environments.map((item) => (
                  <button
                    key={item.environment}
                    onClick={() => handleCategoryClick('environment', item.environment)}
                    className={`px-2 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
                      filters.environment === item.environment
                        ? 'bg-primary text-white'
                        : 'bg-background-card border border-background-border text-slate-400 hover:border-primary/50 hover:text-white'
                    }`}
                  >
                    {item.environment}({item.count})
                  </button>
                ))}
                {categoryStats.environments.length === 0 && (
                  <span className="text-xs text-slate-500">暂无数据</span>
                )}
              </div>
            </div>

            {/* 按角色分类 - 紧凑横向 */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-shrink-0 w-24">
                <HardDrive className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs font-medium text-slate-300">角色</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1">
                {categoryStats.roles.slice(0, 12).map((item) => (
                  <button
                    key={item.role}
                    onClick={() => handleCategoryClick('role', item.role)}
                    className={`px-2 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
                      filters.role === item.role
                        ? 'bg-purple-500 text-white'
                        : 'bg-background-card border border-background-border text-slate-400 hover:border-purple-500/50 hover:text-white'
                    }`}
                  >
                    {item.role}({item.count})
                  </button>
                ))}
                {categoryStats.roles.length > 12 && (
                  <span className="px-2 py-1 text-xs text-slate-500 whitespace-nowrap">
                    +{categoryStats.roles.length - 12}
                  </span>
                )}
                {categoryStats.roles.length === 0 && (
                  <span className="text-xs text-slate-500">暂无数据</span>
                )}
              </div>
            </div>

            {/* 按机柜分类 - 紧凑横向 */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-shrink-0 w-24">
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium text-slate-300">机柜</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1">
                {categoryStats.cabinets.slice(0, 10).map((item) => (
                  <button
                    key={item.cabinet}
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      if (newParams.get('cabinet') === item.cabinet) {
                        newParams.delete('cabinet');
                      } else {
                        newParams.set('cabinet', item.cabinet);
                      }
                      setSearchParams(newParams);
                    }}
                    className={`px-2 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
                      searchParams.get('cabinet') === item.cabinet
                        ? 'bg-amber-500 text-white'
                        : 'bg-background-card border border-background-border text-slate-400 hover:border-amber-500/50 hover:text-white'
                    }`}
                  >
                    {item.cabinet}({item.count})
                  </button>
                ))}
                {categoryStats.cabinets.length > 10 && (
                  <span className="px-2 py-1 text-xs text-slate-500 whitespace-nowrap">
                    +{categoryStats.cabinets.length - 10}
                  </span>
                )}
                {categoryStats.cabinets.length === 0 && (
                  <span className="text-xs text-slate-500">暂无数据</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">服务器管理</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowColumnModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-background-card border border-background-border rounded-lg text-slate-300 hover:text-white hover:border-primary/50 transition-colors"
            title="自定义表格列"
          >
            <Settings2 size={16} />
            列配置
          </button>
          <button
            onClick={fetchServers}
            className="flex items-center gap-2 px-4 py-2 bg-background-card border border-background-border rounded-lg text-slate-300 hover:text-white hover:border-primary/50 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors"
          >
            <Upload size={16} />
            导入数据
          </button>
          <button
            onClick={() => navigate('/servers/new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary rounded-lg text-white hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} />
            新增服务器
          </button>
        </div>
      </div>

      {/* 列配置弹窗 */}
      {showColumnModal && (
        <ColumnConfigModal
          columns={columns}
          onToggle={toggleColumn}
          onReset={resetColumns}
          onClose={() => setShowColumnModal(false)}
        />
      )}

      {/* 导入数据弹窗 */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            fetchServers();
          }}
        />
      )}

      {/* 批量编辑模态框 */}
      <BatchEditModal
        isOpen={showBatchEditModal}
        onClose={() => {
          setShowBatchEditModal(false);
          setBatchEditSql('');
          setBatchEditPreview([]);
        }}
        sql={batchEditSql}
        setSql={setBatchEditSql}
        preview={batchEditPreview}
        onPreview={handleSqlPreview}
        onExecute={handleBatchEdit}
        selectedCount={selectedIds.length}
        history={sqlHistory}
        onRevert={revertToVersion}
        showHistoryPanel={showHistoryPanel}
        onToggleHistory={() => setShowHistoryPanel(!showHistoryPanel)}
      />

      {/* 筛选栏 */}
      <div className="bg-background-card border border-background-border rounded-xl p-4">
        <div className="flex flex-wrap gap-4">
          {/* 环境筛选 - 直接使用 URL 参数驱动 */}
          <select
            value={searchParams.get('environment') || ''}
            onChange={(e) => {
              const newParams = new URLSearchParams(searchParams);
              if (e.target.value) {
                newParams.set('environment', e.target.value);
              } else {
                newParams.delete('environment');
              }
              setSearchParams(newParams);
            }}
            className="bg-background border border-background-border rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
          >
            <option value="">全部环境</option>
            {environments.map(env => (
              <option key={env} value={env}>{env}</option>
            ))}
          </select>

          {/* 状态筛选 - 直接使用 URL 参数驱动 */}
          <select
            value={searchParams.get('status') ?? ''}
            onChange={(e) => {
              const newParams = new URLSearchParams(searchParams);
              if (e.target.value) {
                newParams.set('status', e.target.value);
              } else {
                newParams.delete('status');
              }
              setSearchParams(newParams);
            }}
            className="bg-background border border-background-border rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
          >
            <option value="">全部状态</option>
            <optgroup label="在线状态">
              <option value="online">在线</option>
              <option value="offline">离线</option>
            </optgroup>
            <optgroup label="资产状态">
              <option value="已上架">已上架</option>
              <option value="待上架">待上架</option>
              <option value="异动中">异动中</option>
            </optgroup>
          </select>

          {/* 角色筛选 - 直接使用 URL 参数驱动 */}
          <select
            value={searchParams.get('role') || ''}
            onChange={(e) => {
              const newParams = new URLSearchParams(searchParams);
              if (e.target.value) {
                newParams.set('role', e.target.value);
              } else {
                newParams.delete('role');
              }
              setSearchParams(newParams);
            }}
            className="bg-background border border-background-border rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
          >
            <option value="">全部角色</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          {/* 机柜筛选 - 直接使用 URL 参数驱动 */}
          <select
            value={searchParams.get('cabinet') || ''}
            onChange={(e) => {
              const newParams = new URLSearchParams(searchParams);
              if (e.target.value) {
                newParams.set('cabinet', e.target.value);
              } else {
                newParams.delete('cabinet');
              }
              setSearchParams(newParams);
            }}
            className="bg-background border border-background-border rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
          >
            <option value="">全部机柜</option>
            {categoryStats?.cabinets.map(c => (
              <option key={c.cabinet} value={c.cabinet}>{c.cabinet}</option>
            ))}
          </select>

          {/* 搜索框 */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="搜索IP、SN号、主机名..."
                value={filters.keyword}
                onChange={(e) => setFilters((prev: FilterState) => ({ ...prev, keyword: e.target.value }))}
                className="w-full bg-background border border-background-border rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* 批量操作 */}
        {selectedIds.length > 0 && (
          <div className="mt-4 pt-4 border-t border-background-border flex items-center gap-4">
            <span className="text-sm text-slate-400">
              已选择 {selectedIds.length} 项
            </span>
            <button
              onClick={() => handleBatchStatus('已上架')}
              className="text-sm text-status-online hover:underline"
            >
              批量上架
            </button>
            <button
              onClick={() => handleBatchStatus('待上架')}
              className="text-sm text-slate-400 hover:underline"
            >
              批量下架
            </button>
            <button
              onClick={() => handleBatchStatus('异动中')}
              className="text-sm text-status-warning hover:underline"
            >
              批量异动
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setShowBatchEditModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary/10 text-primary border border-primary/30 rounded-md hover:bg-primary/20 transition-colors"
            >
              <Terminal className="w-4 h-4" />
              SQL 维护
            </button>
            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-md hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              批量删除
            </button>
          </div>
        )}
      </div>

      {/* 服务器表格 */}
      <div className="bg-background-card border border-background-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-background-border">
                {visibleColumns.map(col => (
                  <th key={col.key} className={`text-left p-4 text-sm font-medium text-slate-400 ${col.width || ''}`}>
                    {col.key === 'checkbox' ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.length === servers.length && servers.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-slate-600"
                      />
                    ) : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="p-8 text-center text-slate-500">
                    加载中...
                  </td>
                </tr>
              ) : servers.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="p-8 text-center text-slate-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                servers.map((server) => (
                  <tr
                    key={server.id}
                    className="border-b border-background-border hover:bg-background-border/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/servers/${server.id}`)}
                  >
                    {visibleColumns.map(col => (
                      <td key={col.key} className="p-4" onClick={col.key === 'checkbox' || col.key === 'actions' ? e => e.stopPropagation() : undefined}>
                        {col.key === 'checkbox' && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(server.id)}
                            onChange={() => handleSelect(server.id)}
                            className="w-4 h-4 rounded border-slate-600"
                          />
                        )}
                        {col.key === 'index' && (
                          <span className="text-sm text-slate-500">{servers.indexOf(server) + 1}</span>
                        )}
                        {col.key === 'status' && (
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${onlineStatusColors[server.online_status]}`} />
                            <span className={`text-xs px-2 py-1 rounded ${statusColors[server.status] || 'bg-slate-500/20 text-slate-400'}`}>
                              {server.status}
                            </span>
                          </div>
                        )}
                        {col.key === 'system_ip' && <span className="text-sm text-white font-mono">{server.system_ip || '-'}</span>}
                        {col.key === 'name' && <span className="text-sm text-white">{server.name || '-'}</span>}
                        {col.key === 'environment' && <span className="text-sm text-slate-400">{server.environment || '-'}</span>}
                        {col.key === 'role_type' && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            server.role_type ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-500/20 text-slate-500'
                          }`}>
                            {server.role_type || '-'}
                          </span>
                        )}
                        {col.key === 'role' && <span className="text-sm text-slate-400">{server.role || '-'}</span>}
                        {col.key === 'cabinet' && (
                          <span className="text-sm text-slate-400">
                            {server.cabinet ? (
                              <>{server.cabinet} <span className="text-amber-500">U{server.u_position || 0}-{((server.u_position || 0) + (server.u_height || 2) - 1)}</span></>
                            ) : '-'}
                          </span>
                        )}
                        {col.key === 'brand' && <span className="text-sm text-slate-400">{server.brand || '-'}</span>}
                        {col.key === 'model' && <span className="text-sm text-slate-400">{server.model || '-'}</span>}
                        {col.key === 'sn' && <span className="text-sm text-slate-400 font-mono">{server.sn || '-'}</span>}
                        {col.key === 'manage_ip' && <span className="text-sm text-slate-400 font-mono">{server.manage_ip || '-'}</span>}
                        {col.key === 'oob_ip' && <span className="text-sm text-slate-400 font-mono">{server.oob_ip || '-'}</span>}
                        {col.key === 'cpu' && <span className="text-sm text-slate-400">{server.cpu || '-'}</span>}
                        {col.key === 'memory' && <span className="text-sm text-slate-400">{server.memory || '-'}</span>}
                        {col.key === 'disk' && <span className="text-sm text-slate-400">{server.disk || '-'}</span>}
                        {col.key === 'network_card' && <span className="text-sm text-slate-400">{server.network_card || '-'}</span>}
                        {col.key === 'tags' && <span className="text-sm text-slate-400">{server.tags || '-'}</span>}
                        {col.key === 'remark' && <span className="text-sm text-slate-400 truncate max-w-[150px]">{server.remark || '-'}</span>}
                        {col.key === 'actions' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/servers/${server.id}`)}
                              className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                            >
                              <Edit size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {servers.length > 0 && (
          <div className="p-4 border-t border-background-border flex items-center justify-between">
            <span className="text-sm text-slate-400">
              共 {servers.length} 条记录，已显示 {visibleColumns.length} 列
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// 导入数据弹窗组件
interface ImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function ImportModal({ onClose, onSuccess }: ImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'result'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [filePath, setFilePath] = useState<string>('');
  const [preview, setPreview] = useState<any>(null);
  const [selectedSheet, setSelectedSheet] = useState(0);
  const [importMode, setImportMode] = useState<'single' | 'all'>('single');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      setError('请选择 Excel 文件 (.xlsx 或 .xls)');
      return;
    }
    setFile(selectedFile);
    setError('');
    setLoading(true);
    
    try {
      const uploadRes = await importApi.upload(selectedFile);
      setFilePath(uploadRes.filePath);
      
      const previewRes = await importApi.preview(uploadRes.filePath);
      setPreview(previewRes);
      setStep('preview');
    } catch (err: any) {
      setError('上传或解析文件失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleImport = async () => {
    setStep('importing');
    setLoading(true);
    
    try {
      let importRes: {
        imported: number;
        environments: { created: number; existing: number };
        cabinets: { created: number; existing: number };
        tags: { created: number; existing: number };
        roleTypes: { created: number; existing: number };
        errors: string[];
        message: string;
      };
      
      if (importMode === 'all' && preview?.totalSheets > 1) {
        // 全量导入：只遍历有数据的 sheets
        importRes = {
          imported: 0,
          environments: { created: 0, existing: 0 },
          cabinets: { created: 0, existing: 0 },
          tags: { created: 0, existing: 0 },
          roleTypes: { created: 0, existing: 0 },
          errors: [],
          message: '',
        };
        
        const sheetsWithData = preview.sheets.filter((s: any) => s.serverCount > 0);
        let importedSheets = 0;
        
        for (let i = 0; i < preview.totalSheets; i++) {
          const sheet = preview.sheets[i];
          if (sheet.serverCount > 0) {
            const sheetRes = await importApi.importExcel(filePath, i);
            importRes.imported += sheetRes.imported || 0;
            importRes.environments.created += sheetRes.environments?.created || 0;
            importRes.cabinets.created += sheetRes.cabinets?.created || 0;
            importRes.tags.created += sheetRes.tags?.created || 0;
            importRes.roleTypes.created += sheetRes.roleTypes?.created || 0;
            if (sheetRes.errors) {
              importRes.errors.push(...sheetRes.errors);
            }
            importedSheets++;
          }
        }
        importRes.message = `全量导入完成：共 ${importedSheets} 个工作表，${importRes.imported} 台服务器`;
        
        // 全量导入完成后清理文件
        try {
          await importApi.cleanup(filePath);
        } catch (e) {}
      } else {
        // 单 Sheet 导入
        importRes = await importApi.importExcel(filePath, selectedSheet);
        
        // 单 Sheet 导入完成后清理文件
        try {
          await importApi.cleanup(filePath);
        } catch (e) {}
      }
      setResult(importRes);
      setStep('result');
    } catch (err: any) {
      setError('导入失败: ' + (err.message || '未知错误'));
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const currentSheet = preview?.sheets?.[selectedSheet];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background-card rounded-lg w-full max-w-2xl max-h-[85vh] border border-background-border shadow-xl overflow-hidden">
        {/* 头部 */}
        <div className="p-4 border-b border-background-border flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-400" />
            导入服务器数据
          </h3>
          <button 
            onClick={onClose} 
            className="p-1 text-slate-400 hover:text-white hover:bg-background-border rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-auto max-h-[70vh]">
          {/* 步骤指示器 */}
          <div className="flex items-center gap-2 mb-6">
            {['上传文件', '预览确认', '导入结果'].map((label, idx) => {
              const stepIdx = ['upload', 'preview', 'result'].indexOf(step);
              const isActive = idx <= stepIdx;
              const isCurrent = step === ['upload', 'preview', 'importing', 'result'][idx] || 
                               (step === 'importing' && idx === 2) ||
                               (step === 'result' && idx === 2);
              return (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    isActive ? 'bg-green-500 text-white' : 'bg-background-border text-slate-500'
                  }`}>
                    {idx < stepIdx ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-sm ${isActive ? 'text-white' : 'text-slate-500'}`}>
                    {label}
                  </span>
                  {idx < 2 && <span className="text-slate-600 mx-1">→</span>}
                </div>
              );
            })}
          </div>

          {/* 上传步骤 */}
          {step === 'upload' && (
            <div>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging 
                    ? 'border-green-500 bg-green-500/10' 
                    : 'border-background-border hover:border-green-500/50 hover:bg-background-border/50'
                }`}
              >
                <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p className="text-white mb-2">点击或拖拽上传 Excel 文件</p>
                <p className="text-sm text-slate-500">支持 .xlsx 和 .xls 格式</p>
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>
              
              {file && (
                <div className="mt-4 p-3 bg-background rounded-lg border border-background-border flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-green-400" />
                  <span className="text-white text-sm flex-1 truncate">{file.name}</span>
                  <span className="text-slate-500 text-sm">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              )}
              
              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}
              
              {loading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>正在上传和解析...</span>
                </div>
              )}
              
              {/* 导入说明 */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h4 className="text-blue-400 font-medium mb-2">导入说明</h4>
                <ul className="text-sm text-blue-200/80 space-y-1">
                  <li>• 支持从 Excel 文件导入服务器数据</li>
                  <li>• 自动识别并关联环境、机柜、标签、角色类型</li>
                  <li>• 支持的字段：系统IP、管理IP、带外IP、SN号、品牌、型号、配置、机柜、环境、角色、角色类型、标签等</li>
                  <li>• 如果环境、机柜、标签、角色类型不存在，将自动创建</li>
                </ul>
              </div>
            </div>
          )}

          {/* 预览步骤 */}
          {step === 'preview' && preview && (
            <div>
              {/* 导入模式选择 */}
              {preview.totalSheets > 1 && (
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-2">导入模式</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setImportMode('single')}
                      className={`px-4 py-2 rounded-md text-sm transition-colors ${
                        importMode === 'single'
                          ? 'bg-green-500 text-white'
                          : 'bg-background border border-background-border text-slate-400 hover:text-white'
                      }`}
                    >
                      单Sheet导入
                    </button>
                    <button
                      onClick={() => setImportMode('all')}
                      className={`px-4 py-2 rounded-md text-sm transition-colors ${
                        importMode === 'all'
                          ? 'bg-blue-500 text-white'
                          : 'bg-background border border-background-border text-slate-400 hover:text-white'
                      }`}
                    >
                      全量导入（{preview.totalSheets} 个工作表）
                    </button>
                  </div>
                </div>
              )}
              
              {/* Sheet 选择（单Sheet模式时显示） */}
              {preview.totalSheets > 1 && importMode === 'single' && (
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-2">选择工作表</label>
                  <div className="flex gap-2 flex-wrap">
                    {preview.sheets.map((sheet: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedSheet(idx)}
                        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                          selectedSheet === idx
                            ? 'bg-green-500 text-white'
                            : 'bg-background border border-background-border text-slate-400 hover:text-white'
                        }`}
                      >
                        {sheet.name} ({sheet.serverCount} 台)
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 全量导入汇总 */}
              {importMode === 'all' && preview.totalSheets > 1 && (
                <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h4 className="text-blue-400 font-medium mb-3">全量导入汇总</h4>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">工作表数量</p>
                      <p className="text-blue-400 font-medium text-lg">{preview.totalSheets} 个</p>
                    </div>
                    <div>
                      <p className="text-slate-400">总数据行数</p>
                      <p className="text-blue-400 font-medium text-lg">
                        {preview.sheets.reduce((sum: number, s: any) => sum + s.totalRows, 0)} 行
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">可导入服务器</p>
                      <p className="text-blue-400 font-medium text-lg">
                        {preview.sheets.reduce((sum: number, s: any) => sum + s.serverCount, 0)} 台
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">检测到环境</p>
                      <p className="text-blue-400 font-medium text-lg">
                        {[...new Set(preview.sheets.flatMap((s: any) => {
                          // 优先使用环境列，否则使用sheet名称
                          const envKeys = ['环境', 'environment', 'env', 'ENV', 'Env', '环', '环境名称', '环境名'];
                          const hasEnvColumn = s.sampleData?.some((r: any) => 
                            envKeys.some(key => r[key] !== undefined && r[key] !== null && String(r[key]).trim())
                          );
                          if (hasEnvColumn) {
                            return s.sampleData?.map((r: any) => {
                              for (const key of envKeys) {
                                if (r[key] !== undefined && r[key] !== null && String(r[key]).trim()) {
                                  return String(r[key]).trim();
                                }
                              }
                              return null;
                            }).filter(Boolean);
                          } else {
                            // 没有环境列时，使用sheet名称作为环境
                            return [s.name];
                          }
                        }))].length} 个
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 数据预览 */}
              <div className="mb-4">
                <h4 className="text-sm text-slate-400 mb-2">
                  {importMode === 'all' ? '全量数据预览' : `数据预览 - ${currentSheet?.name} (${currentSheet?.totalRows} 行)`}
                </h4>
                
                {importMode === 'all' ? (
                  // 全量模式：显示所有工作表预览
                  <div className="space-y-3">
                    {preview.sheets.map((sheet: any, idx: number) => (
                      <div key={idx} className="border border-background-border rounded-lg overflow-hidden">
                        <div className="bg-background px-3 py-2 flex items-center justify-between">
                          <span className="text-white font-medium">{sheet.name}</span>
                          <span className="text-slate-400 text-sm">{sheet.serverCount} 台服务器</span>
                        </div>
                        <div className="overflow-x-auto max-h-32">
                          <table className="w-full text-xs">
                            <thead className="bg-background/50">
                              <tr>
                                {sheet.columns?.slice(0, 6).map((col: string) => (
                                  <th key={col} className="px-2 py-1 text-left text-slate-400 font-medium whitespace-nowrap">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-background-border">
                              {sheet.sampleData?.slice(0, 3).map((row: any, ridx: number) => (
                                <tr key={ridx} className="hover:bg-background-border/30">
                                  {sheet.columns?.slice(0, 6).map((col: string) => (
                                    <td key={col} className="px-2 py-1 text-slate-300 whitespace-nowrap truncate max-w-[120px]">
                                      {row[col] ?? '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // 单Sheet模式：显示选中sheet的预览
                  <div className="overflow-x-auto border border-background-border rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-background">
                        <tr>
                          {currentSheet?.columns?.slice(0, 8).map((col: string) => (
                            <th key={col} className="px-3 py-2 text-left text-slate-400 font-medium whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                          {currentSheet?.columns?.length > 8 && (
                            <th className="px-3 py-2 text-slate-500">...</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-background-border">
                        {currentSheet?.sampleData?.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-background-border/50">
                            {currentSheet?.columns?.slice(0, 8).map((col: string) => (
                              <td key={col} className="px-3 py-2 text-slate-300 whitespace-nowrap truncate max-w-[150px]">
                                {row[col] ?? '-'}
                              </td>
                            ))}
                            {currentSheet?.columns?.length > 8 && (
                              <td className="px-3 py-2 text-slate-500">...</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              {/* 自动关联信息 */}
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <h4 className="text-green-400 font-medium mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  将自动执行以下关联
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">检测到环境</p>
                    <p className="text-green-400 font-medium">
                      {(() => {
                        const envKeys = ['环境', 'environment', 'env', 'ENV', 'Env', '环', '环境名称', '环境名'];
                        const getEnvironments = (sheet: any) => {
                          const hasEnvColumn = sheet.sampleData?.some((r: any) => 
                            envKeys.some(key => r[key] !== undefined && r[key] !== null && String(r[key]).trim())
                          );
                          if (hasEnvColumn) {
                            return sheet.sampleData?.map((r: any) => {
                              for (const key of envKeys) {
                                if (r[key] !== undefined && r[key] !== null && String(r[key]).trim()) {
                                  return String(r[key]).trim();
                                }
                              }
                              return null;
                            }).filter(Boolean) || [];
                          } else {
                            // 没有环境列时，使用sheet名称作为环境
                            return [sheet.name];
                          }
                        };
                        
                        const envs = importMode === 'all'
                          ? preview.sheets.flatMap((s: any) => getEnvironments(s))
                          : getEnvironments(currentSheet);
                        return [...new Set(envs)].length;
                      })()} 个
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">检测到机柜</p>
                    <p className="text-green-400 font-medium">
                      {(() => {
                        const cabinets = importMode === 'all'
                          ? preview.sheets.flatMap((s: any) => s.sampleData?.map((r: any) => r['机柜'] || r['cabinet']) || [])
                          : (currentSheet?.sampleData?.map((r: any) => r['机柜'] || r['cabinet']) || []);
                        return [...new Set(cabinets.filter(Boolean))].length;
                      })()} 个
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">待导入服务器</p>
                    <p className="text-green-400 font-medium">
                      {importMode === 'all'
                        ? preview.sheets.reduce((sum: number, s: any) => sum + s.serverCount, 0)
                        : currentSheet?.serverCount} 台
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 导入中 */}
          {step === 'importing' && (
            <div className="text-center py-8">
              <RefreshCw className="w-12 h-12 text-green-400 mx-auto mb-4 animate-spin" />
              <p className="text-white text-lg">正在导入数据...</p>
              <p className="text-slate-400 text-sm mt-2">请稍候，自动关联中</p>
            </div>
          )}

          {/* 结果 */}
          {step === 'result' && result && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h4 className="text-xl font-semibold text-white">导入完成</h4>
                <p className="text-slate-400 mt-1">{result.message}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background rounded-lg p-4 border border-background-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <ServerIcon className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-400">{result.imported}</p>
                      <p className="text-sm text-slate-400">导入服务器</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-background rounded-lg p-4 border border-background-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <Layers className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-400">{result.environments?.created || 0}</p>
                      <p className="text-sm text-slate-400">新建环境</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-background rounded-lg p-4 border border-background-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-400">{result.cabinets?.created || 0}</p>
                      <p className="text-sm text-slate-400">新建机柜</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-background rounded-lg p-4 border border-background-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-400">{result.tags?.created || 0}</p>
                      <p className="text-sm text-slate-400">新建标签</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-background rounded-lg p-4 border border-background-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                      <HardDrive className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-indigo-400">{result.roleTypes?.created || 0}</p>
                      <p className="text-sm text-slate-400">新建角色类型</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {result.errors?.length > 0 && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <h4 className="text-red-400 font-medium mb-2">部分导入失败</h4>
                  <ul className="text-sm text-red-300/80 space-y-1 max-h-32 overflow-auto">
                    {result.errors.slice(0, 10).map((err: string, idx: number) => (
                      <li key={idx}>• {err}</li>
                    ))}
                    {result.errors.length > 10 && (
                      <li className="text-slate-400">...还有 {result.errors.length - 10} 条错误</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-background-border flex justify-end gap-3">
          {step === 'upload' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-background-border rounded-md text-slate-400 hover:text-white hover:bg-background-border transition-colors"
              >
                取消
              </button>
            </>
          )}
          
          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 border border-background-border rounded-md text-slate-400 hover:text-white hover:bg-background-border transition-colors"
              >
                上一步
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className={`px-4 py-2 text-white rounded-md transition-colors flex items-center gap-2 ${
                  importMode === 'all' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {importMode === 'all' ? '全量导入中...' : '导入中...'}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {importMode === 'all' ? '全量导入' : '开始导入'}
                  </>
                )}
              </button>
            </>
          )}
          
          {step === 'result' && (
            <button
              onClick={onSuccess}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
            >
              完成
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 列配置弹窗组件
interface ColumnConfigModalProps {
  columns: ColumnConfig[];
  onToggle: (key: string) => void;
  onReset: () => void;
  onClose: () => void;
}

function ColumnConfigModal({ columns, onToggle, onReset, onClose }: ColumnConfigModalProps) {
  const visibleCount = columns.filter(c => c.visible).length;
  
  // 按类别分组
  const basicCols = columns.filter(c => ['checkbox', 'status', 'system_ip', 'name'].includes(c.key));
  const networkCols = columns.filter(c => ['manage_ip', 'oob_ip'].includes(c.key));
  const hardwareCols = columns.filter(c => ['cpu', 'memory', 'disk', 'network_card'].includes(c.key));
  const locationCols = columns.filter(c => ['environment', 'role', 'cabinet'].includes(c.key));
  const infoCols = columns.filter(c => ['brand', 'model', 'sn'].includes(c.key));
  const otherCols = columns.filter(c => ['tags', 'remark', 'actions'].includes(c.key));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background-card rounded-lg w-full max-w-lg max-h-[80vh] border border-background-border shadow-xl overflow-hidden">
        {/* 头部 */}
        <div className="p-4 border-b border-background-border flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-indigo-400" />
              自定义表格列
            </h3>
            <p className="text-sm text-slate-400 mt-1">已显示 {visibleCount} / {columns.length} 列</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 text-slate-400 hover:text-white hover:bg-background-border rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 overflow-auto max-h-[60vh] space-y-4">
          {/* 基本信息 */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">基本信息</h4>
            <div className="grid grid-cols-2 gap-2">
              {basicCols.map(col => (
                <label 
                  key={col.key} 
                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                    col.visible 
                      ? 'bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20' 
                      : 'bg-background border border-background-border hover:bg-background-border/50'
                  }`}
                >
                  <button
                    onClick={() => onToggle(col.key)}
                    className={`p-1 rounded transition-colors ${
                      col.visible ? 'text-indigo-400' : 'text-slate-500'
                    }`}
                  >
                    {col.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <span className={`text-sm ${col.visible ? 'text-white' : 'text-slate-400'}`}>
                    {col.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 网络信息 */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">网络信息</h4>
            <div className="grid grid-cols-2 gap-2">
              {networkCols.map(col => (
                <label 
                  key={col.key} 
                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                    col.visible 
                      ? 'bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20' 
                      : 'bg-background border border-background-border hover:bg-background-border/50'
                  }`}
                >
                  <button
                    onClick={() => onToggle(col.key)}
                    className={`p-1 rounded transition-colors ${
                      col.visible ? 'text-indigo-400' : 'text-slate-500'
                    }`}
                  >
                    {col.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <span className={`text-sm ${col.visible ? 'text-white' : 'text-slate-400'}`}>
                    {col.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 硬件配置 */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">硬件配置</h4>
            <div className="grid grid-cols-2 gap-2">
              {hardwareCols.map(col => (
                <label 
                  key={col.key} 
                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                    col.visible 
                      ? 'bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20' 
                      : 'bg-background border border-background-border hover:bg-background-border/50'
                  }`}
                >
                  <button
                    onClick={() => onToggle(col.key)}
                    className={`p-1 rounded transition-colors ${
                      col.visible ? 'text-indigo-400' : 'text-slate-500'
                    }`}
                  >
                    {col.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <span className={`text-sm ${col.visible ? 'text-white' : 'text-slate-400'}`}>
                    {col.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 位置信息 */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">位置信息</h4>
            <div className="grid grid-cols-2 gap-2">
              {locationCols.map(col => (
                <label 
                  key={col.key} 
                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                    col.visible 
                      ? 'bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20' 
                      : 'bg-background border border-background-border hover:bg-background-border/50'
                  }`}
                >
                  <button
                    onClick={() => onToggle(col.key)}
                    className={`p-1 rounded transition-colors ${
                      col.visible ? 'text-indigo-400' : 'text-slate-500'
                    }`}
                  >
                    {col.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <span className={`text-sm ${col.visible ? 'text-white' : 'text-slate-400'}`}
                  >
                    {col.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 设备信息 */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">设备信息</h4>
            <div className="grid grid-cols-2 gap-2">
              {infoCols.map(col => (
                <label 
                  key={col.key} 
                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                    col.visible 
                      ? 'bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20' 
                      : 'bg-background border border-background-border hover:bg-background-border/50'
                  }`}
                >
                  <button
                    onClick={() => onToggle(col.key)}
                    className={`p-1 rounded transition-colors ${
                      col.visible ? 'text-indigo-400' : 'text-slate-500'
                    }`}
                  >
                    {col.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <span className={`text-sm ${col.visible ? 'text-white' : 'text-slate-400'}`}>
                    {col.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 其他 */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">其他</h4>
            <div className="grid grid-cols-2 gap-2">
              {otherCols.map(col => (
                <label 
                  key={col.key} 
                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                    col.visible 
                      ? 'bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20' 
                      : 'bg-background border border-background-border hover:bg-background-border/50'
                  }`}
                >
                  <button
                    onClick={() => onToggle(col.key)}
                    className={`p-1 rounded transition-colors ${
                      col.visible ? 'text-indigo-400' : 'text-slate-500'
                    }`}
                  >
                    {col.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <span className={`text-sm ${col.visible ? 'text-white' : 'text-slate-400'}`}>
                    {col.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-background-border flex justify-between items-center">
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-background-border rounded-md transition-colors"
          >
            重置为默认
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}

// 批量编辑模态框组件
function BatchEditModal({
  isOpen,
  onClose,
  sql,
  setSql,
  preview,
  onPreview,
  onExecute,
  selectedCount,
  history,
  onRevert,
  showHistoryPanel,
  onToggleHistory
}: {
  isOpen: boolean;
  onClose: () => void;
  sql: string;
  setSql: (v: string) => void;
  preview: { field: string; value: string; count: number }[];
  onPreview: () => void;
  onExecute: () => void;
  selectedCount: number;
  history: SqlHistoryItem[];
  onRevert: (item: SqlHistoryItem) => void;
  showHistoryPanel: boolean;
  onToggleHistory: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-background-card border border-background-border rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-background-border">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-white font-semibold">SQL 数据维护</h3>
              <p className="text-xs text-slate-400">已选择 {selectedCount} 台服务器</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* 左侧：SQL 输入区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              {/* SQL 输入 */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">输入 SQL 语句</label>
                <div className="relative">
                  <textarea
                    value={sql}
                    onChange={(e) => setSql(e.target.value)}
                    onBlur={onPreview}
                    placeholder={`-- 示例1: 更新选中服务器的标签\nSET tags = 'kvm'\n\n-- 示例2: 更新选中服务器中角色为BGW的标签\nSET tags = 'kvm' WHERE role = 'BGW'\n\n-- 示例3: 更新选中服务器中环境为生产环境的状态\nSET status = '已上架' WHERE environment = '生产环境'\n\n-- 示例4: 更新选中服务器的备注\nSET remark = '已迁移至新机房'`}
                    className="w-full h-36 bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm text-green-400 font-mono placeholder:text-slate-600 focus:border-primary focus:outline-none resize-none"
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-slate-500">
                    SQL 语法支持 SET field = 'value'
                  </div>
                </div>
              </div>

              {/* 可用字段 */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-sm text-slate-400 mb-2">可编辑字段</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    { field: 'name', label: '主机名' },
                    { field: 'environment', label: '环境' },
                    { field: 'role', label: '角色' },
                    { field: 'role_type', label: '角色类型' },
                    { field: 'tags', label: '标签' },
                    { field: 'remark', label: '备注' },
                    { field: 'status', label: '状态' },
                    { field: 'cabinet', label: '机柜' },
                    { field: 'sn', label: 'SN号' },
                    { field: 'brand', label: '品牌' },
                    { field: 'model', label: '型号' },
                    { field: 'cpu', label: 'CPU' },
                    { field: 'memory', label: '内存' },
                    { field: 'disk', label: '磁盘' },
                  ].map(({ field, label }) => (
                    <code key={field} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300" title={label}>
                      {field}
                    </code>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <p className="text-xs text-slate-500">
                    字段: name=主机名 | environment=环境 | role=角色 | role_type=角色类型 | tags=标签 | remark=备注 | status=状态 | cabinet=机柜 | sn=SN号 | brand=品牌 | model=型号 | cpu=CPU | memory=内存 | disk=磁盘
                  </p>
                </div>
              </div>

              {/* 示例语句 */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-sm text-slate-400 mb-3">示例语句</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-500 whitespace-nowrap">1. 更新选中服务器标签:</span>
                    <code className="px-2 py-0.5 bg-slate-700 rounded text-green-400 font-mono">SET tags = 'kvm'</code>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-slate-500 whitespace-nowrap">2. 按角色条件更新:</span>
                    <code className="px-2 py-0.5 bg-slate-700 rounded text-green-400 font-mono">SET tags = 'kvm' WHERE role = 'BGW'</code>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-slate-500 whitespace-nowrap">3. 按环境条件更新:</span>
                    <code className="px-2 py-0.5 bg-slate-700 rounded text-green-400 font-mono">SET status = '已上架' WHERE environment = '生产环境'</code>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-slate-500 whitespace-nowrap">4. 更新备注:</span>
                    <code className="px-2 py-0.5 bg-slate-700 rounded text-green-400 font-mono">SET remark = '已迁移'</code>
                  </div>
                </div>
              </div>

              {/* 预览结果 */}
              {preview.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="text-sm text-slate-400 mb-2">预览结果</h4>
                  {preview[0].field.includes('error') || preview[0].field.includes('字段') ? (
                    <p className="text-red-400 text-sm">{preview[0].field}</p>
                  ) : (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-400">将更新</span>
                      <span className="text-primary font-semibold">{preview[0].count}</span>
                      <span className="text-slate-400">台服务器的</span>
                      <code className="px-2 py-0.5 bg-slate-700 rounded text-cyan-400">{preview[0].field}</code>
                      <span className="text-slate-400">为</span>
                      <code className="px-2 py-0.5 bg-slate-700 rounded text-green-400">'{preview[0].value}'</code>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 右侧：变更历史 */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm text-slate-400 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  变更历史
                  <span className="text-xs text-slate-500">({history.length} 条)</span>
                </h4>
                <button
                  onClick={onToggleHistory}
                  className="text-xs text-slate-500 hover:text-white flex items-center gap-1"
                >
                  {showHistoryPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showHistoryPanel ? '收起' : '展开'}
                </button>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  暂无变更历史
                </div>
              ) : showHistoryPanel ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {history.map((item, index) => (
                    <div
                      key={item.id}
                      className={`bg-slate-900/50 rounded-lg p-3 border ${item.reverted ? 'border-slate-700 opacity-60' : 'border-slate-700'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">
                              {item.field}
                            </code>
                            {item.reverted && (
                              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                                已回退
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 space-y-0.5">
                            <div>
                              <span className="text-slate-500">{item.oldValue || '(空)'}</span>
                              <span className="text-slate-600 mx-1">→</span>
                              <span className="text-green-400">{item.newValue}</span>
                            </div>
                            <div className="text-slate-500 truncate">
                              影响: {item.count} 台 {item.whereConditions ? `| 条件: ${item.whereConditions}` : ''}
                            </div>
                            <div className="text-slate-600">
                              {item.timestamp} {index === 0 && <span className="text-primary ml-1">(最新)</span>}
                            </div>
                          </div>
                        </div>
                        {!item.reverted && (
                          <button
                            onClick={() => onRevert(item)}
                            className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded text-xs transition-colors flex-shrink-0"
                            title="一键回退"
                          >
                            <RotateCcw className="w-3 h-3" />
                            回退
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-slate-500 text-sm">
                  点击展开查看历史记录
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-background-border flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-background-border rounded-md transition-colors"
          >
            取消
          </button>
          <button
            onClick={onPreview}
            className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
          >
            预览
          </button>
          <button
            onClick={onExecute}
            disabled={!sql.trim() || preview.length === 0 || preview[0].field.includes('error')}
            className="px-4 py-2 text-sm bg-primary hover:bg-primary/80 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            执行更新
          </button>
        </div>
      </div>
    </div>
  );
}
