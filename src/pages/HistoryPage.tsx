import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History, Search, Filter, Calendar } from 'lucide-react';
import { changeLogApi } from '../services/api';
import type { ChangeLog } from '../types';

const changeTypeColors: Record<string, string> = {
  '上架': 'bg-status-online/20 text-status-online',
  '下架': 'bg-status-offline/20 text-status-offline',
  '迁移': 'bg-purple-500/20 text-purple-400',
  '故障': 'bg-status-warning/20 text-status-warning',
  '编辑': 'bg-primary/20 text-primary',
  '批量更新': 'bg-slate-500/20 text-slate-400',
};

export function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    keyword: searchParams.get('keyword') || '',
    change_type: searchParams.get('type') || '',
    start_date: searchParams.get('start') || '',
    end_date: searchParams.get('end') || '',
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await changeLogApi.getAll({
        keyword: filters.keyword || undefined,
        change_type: filters.change_type || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
      });
      setLogs(data);
    } catch (error) {
      console.error('获取变更记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    const params = new URLSearchParams();
    if (newFilters.keyword) params.set('keyword', newFilters.keyword);
    if (newFilters.change_type) params.set('type', newFilters.change_type);
    if (newFilters.start_date) params.set('start', newFilters.start_date);
    if (newFilters.end_date) params.set('end', newFilters.end_date);
    setSearchParams(params);
  };

  const changeTypes = ['上架', '下架', '迁移', '故障', '编辑', '批量更新'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">变更历史</h1>
      </div>

      {/* 筛选栏 */}
      <div className="bg-background-card border border-background-border rounded-xl p-4">
        <div className="flex flex-wrap gap-4">
          {/* 搜索框 */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="搜索服务器名称..."
                value={filters.keyword}
                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                className="w-full bg-background border border-background-border rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* 变更类型 */}
          <select
            value={filters.change_type}
            onChange={(e) => handleFilterChange('change_type', e.target.value)}
            className="bg-background border border-background-border rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
          >
            <option value="">全部类型</option>
            {changeTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {/* 开始日期 */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="bg-background border border-background-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
            />
          </div>

          {/* 结束日期 */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="bg-background border border-background-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
            />
          </div>

          {/* 重置按钮 */}
          {(filters.keyword || filters.change_type || filters.start_date || filters.end_date) && (
            <button
              onClick={() => {
                setFilters({ keyword: '', change_type: '', start_date: '', end_date: '' });
                setSearchParams({});
              }}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white"
            >
              重置筛选
            </button>
          )}
        </div>
      </div>

      {/* 变更记录列表 */}
      <div className="bg-background-card border border-background-border rounded-xl">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            加载中...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            暂无变更记录
          </div>
        ) : (
          <div className="divide-y divide-background-border">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-background-border/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <History className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-white font-medium">{log.server_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${changeTypeColors[log.change_type] || 'bg-slate-500/20 text-slate-400'}`}>
                        {log.change_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-2">
                      <span>{log.before_status}</span>
                      <span className="text-slate-600">→</span>
                      <span>{log.after_status}</span>
                    </div>
                    {log.remark && (
                      <p className="text-sm text-slate-500 mb-2">{log.remark}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <span>操作人: {log.operator}</span>
                      <span>{new Date(log.created_at).toLocaleString('zh-CN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
