import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Server as ServerIcon, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { serverApi, environmentApi, cabinetApi } from '../services/api';
import type { ServerStats } from '../types';

const COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export function AssetsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [environmentCount, setEnvironmentCount] = useState(0);
  const [cabinetCount, setCabinetCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsData, envData, cabinetData] = await Promise.all([
          serverApi.getStats(),
          environmentApi.getAll(),
          cabinetApi.getAll(),
        ]);
        setStats(statsData);
        setEnvironmentCount(envData.length);
        setCabinetCount(cabinetData.length);
      } catch (error) {
        console.error('获取统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">资产管理</h1>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-background-card border border-background-border rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <ServerIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-slate-400">服务器总数</p>
              <p className="text-2xl font-bold text-white">{stats?.total || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-background-card border border-background-border rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-status-online/10 rounded-xl flex items-center justify-center">
              <Layers className="w-6 h-6 text-status-online" />
            </div>
            <div>
              <p className="text-sm text-slate-400">环境数量</p>
              <p className="text-2xl font-bold text-white">{environmentCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-background-card border border-background-border rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-status-warning/10 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-status-warning" />
            </div>
            <div>
              <p className="text-sm text-slate-400">机柜数量</p>
              <p className="text-2xl font-bold text-white">{cabinetCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 角色分布 */}
        <div className="bg-background-card border border-background-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">角色分布</h2>
          {stats?.byRole && stats.byRole.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byRole} layout="vertical">
                  <XAxis type="number" stroke="#64748B" fontSize={12} />
                  <YAxis 
                    type="category" 
                    dataKey="role" 
                    stroke="#64748B" 
                    fontSize={12} 
                    width={100}
                    tick={{ fill: '#94A3B8' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-500">
              暂无数据
            </div>
          )}
        </div>

        {/* 环境分布 */}
        <div className="bg-background-card border border-background-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">环境分布</h2>
          {stats?.byEnvironment && stats.byEnvironment.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.byEnvironment}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="environment"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {stats.byEnvironment.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-500">
              暂无数据
            </div>
          )}
        </div>
      </div>

      {/* 机柜列表 */}
      <div className="bg-background-card border border-background-border rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">机柜使用情况</h2>
        {stats?.byCabinet && stats.byCabinet.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stats.byCabinet.map((cabinet) => (
              <div
                key={cabinet.cabinet}
                onClick={() => navigate(`/servers?cabinet=${cabinet.cabinet}`)}
                className="p-4 bg-background border border-background-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{cabinet.cabinet}</span>
                  <span className="text-xs text-primary">{cabinet.count}台</span>
                </div>
                <div className="h-2 bg-background-border rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                    style={{ width: `${Math.min((cabinet.count / 20) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">
            暂无机柜数据
          </div>
        )}
      </div>
    </div>
  );
}
