import { useState, useEffect } from 'react';
import { auditLogApi } from '../services/api';
import type { AuditLog, AuditLogStats } from '../types';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Activity,
  User,
  Clock,
  Target,
  AlertCircle,
  CheckCircle,
  Edit,
  Plus,
  X,
  Trash2
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';

export function AuditPage() {
  const { user } = useAppStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // 筛选条件
  const [filters, setFilters] = useState({
    username: '',
    action: '',
    target_type: '',
    start_date: '',
    end_date: '',
    keyword: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [actions, setActions] = useState<string[]>([]);
  const [targetTypes, setTargetTypes] = useState<string[]>([]);

  // 详情弹窗
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailModal, setDetailModal] = useState(false);

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const [logsRes, statsRes, actionsRes, targetTypesRes] = await Promise.all([
        auditLogApi.getAll({ ...filters, page, page_size: pageSize }),
        auditLogApi.getStats(),
        auditLogApi.getActions(),
        auditLogApi.getTargetTypes(),
      ]);
      setLogs(logsRes.data);
      setTotal(logsRes.total);
      setTotalPages(Math.ceil(logsRes.total / pageSize));
      setStats(statsRes);
      setActions(actionsRes);
      setTargetTypes(targetTypesRes);
    } catch (error) {
      console.error('加载审计日志失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page]);

  // 搜索
  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  // 重置筛选
  const handleReset = () => {
    setFilters({
      username: '',
      action: '',
      target_type: '',
      start_date: '',
      end_date: '',
      keyword: '',
    });
    setPage(1);
    loadData();
  };

  // 查看详情
  const handleViewDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailModal(true);
  };

  // 获取操作类型图标和颜色
  const getActionIcon = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('登录') || actionLower.includes('login')) {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
    if (actionLower.includes('删除') || actionLower.includes('delete')) {
      return <Trash2 className="w-4 h-4 text-red-400" />;
    }
    if (actionLower.includes('创建') || actionLower.includes('create') || actionLower.includes('新增')) {
      return <Plus className="w-4 h-4 text-blue-400" />;
    }
    if (actionLower.includes('修改') || actionLower.includes('更新') || actionLower.includes('edit') || actionLower.includes('update')) {
      return <Edit className="w-4 h-4 text-yellow-400" />;
    }
    return <Activity className="w-4 h-4 text-slate-400" />;
  };

  // 格式化时间
  const formatTime = (time: string) => {
    const date = new Date(time);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    
    return date.toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">操作审计</h1>
          <p className="text-sm text-slate-400 mt-1">记录系统中所有用户的操作行为</p>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-background-card rounded-lg p-4 border border-background-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">{total}</p>
                <p className="text-sm text-slate-400">总记录数</p>
              </div>
            </div>
          </div>
          <div className="bg-background-card rounded-lg p-4 border border-background-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">{stats.today}</p>
                <p className="text-sm text-slate-400">今日操作</p>
              </div>
            </div>
          </div>
          <div className="bg-background-card rounded-lg p-4 border border-background-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">{stats.week}</p>
                <p className="text-sm text-slate-400">本周操作</p>
              </div>
            </div>
          </div>
          <div className="bg-background-card rounded-lg p-4 border border-background-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <User className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">{stats.byUser.length}</p>
                <p className="text-sm text-slate-400">活跃用户</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 搜索和筛选 */}
      <div className="bg-background-card rounded-lg border border-background-border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索操作目标或详情..."
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 bg-background border border-background-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="用户名"
              value={filters.username}
              onChange={(e) => setFilters({ ...filters, username: e.target.value })}
              className="w-28 px-3 py-2 bg-background border border-background-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary text-sm"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showFilters ? 'bg-primary text-white' : 'bg-background border border-background-border text-slate-300 hover:bg-background-border'
              }`}
            >
              <Filter size={16} />
              筛选
            </button>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              搜索
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-background border border-background-border text-slate-300 rounded-lg hover:bg-background-border transition-colors"
            >
              重置
            </button>
          </div>
        </div>

        {/* 高级筛选 */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-background-border grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">操作类型</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-background-border rounded-lg text-white focus:outline-none focus:border-primary"
              >
                <option value="">全部</option>
                {actions.map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">目标类型</label>
              <select
                value={filters.target_type}
                onChange={(e) => setFilters({ ...filters, target_type: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-background-border rounded-lg text-white focus:outline-none focus:border-primary"
              >
                <option value="">全部</option>
                {targetTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">开始日期</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-background-border rounded-lg text-white focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">结束日期</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-background-border rounded-lg text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* 日志列表 */}
      <div className="bg-background-card rounded-lg border border-background-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-background-border">
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">操作</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">用户</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">目标</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">详情</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">IP地址</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">时间</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    加载中...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Activity className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                    暂无审计日志
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr 
                    key={log.id} 
                    className="border-b border-background-border hover:bg-background/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="text-white text-sm">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
                          {log.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-slate-300 text-sm">{log.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-slate-300 text-sm">{log.target || '-'}</span>
                        {log.target_type && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded">
                            {log.target_type}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-400 text-sm truncate max-w-[200px] block" title={log.detail || '-'}>
                        {log.detail || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-400 text-sm font-mono">{log.ip_address || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-slate-300 text-sm">{formatTime(log.created_at)}</span>
                        <span className="block text-xs text-slate-500">
                          {new Date(log.created_at).toLocaleString('zh-CN')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewDetail(log)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-background-border rounded transition-colors"
                        title="查看详情"
                      >
                        <Target className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-background-border">
            <div className="text-sm text-slate-400">
              共 {total} 条记录，第 {page} / {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-background border border-background-border text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm ${
                      page === pageNum
                        ? 'bg-primary text-white'
                        : 'bg-background border border-background-border text-slate-400 hover:text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-background border border-background-border text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      {detailModal && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDetailModal(false)}>
          <div className="bg-background-card rounded-lg border border-background-border w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-background-border">
              <h3 className="text-lg font-medium text-white">审计详情</h3>
              <button
                onClick={() => setDetailModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">操作类型</label>
                  <div className="flex items-center gap-2">
                    {getActionIcon(selectedLog.action)}
                    <span className="text-white">{selectedLog.action}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">操作用户</label>
                  <p className="text-white">{selectedLog.username || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">目标对象</label>
                  <p className="text-white">{selectedLog.target || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">目标类型</label>
                  <p className="text-white">{selectedLog.target_type || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">IP地址</label>
                  <p className="text-white font-mono">{selectedLog.ip_address || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">操作时间</label>
                  <p className="text-white">{new Date(selectedLog.created_at).toLocaleString('zh-CN')}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">操作详情</label>
                <p className="text-white bg-background p-3 rounded-lg text-sm whitespace-pre-wrap">
                  {selectedLog.detail || '(无详情)'}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-background-border flex justify-end">
              <button
                onClick={() => setDetailModal(false)}
                className="px-4 py-2 bg-background border border-background-border text-slate-300 rounded-lg hover:bg-background-border transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
