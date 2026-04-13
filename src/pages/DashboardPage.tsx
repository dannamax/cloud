import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Server, 
  Activity, 
  AlertTriangle, 
  RefreshCw, 
  Upload,
  ServerCrash,
  Clock,
  Layers,
  Database
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { serverApi, changeLogApi, environmentApi, cabinetApi } from '../services/api';
import type { ServerStats, ChangeLog, Environment, Cabinet } from '../types';

const COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<ChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [environmentCount, setEnvironmentCount] = useState(0);
  const [cabinetCount, setCabinetCount] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, logsData, envData, cabinetData] = await Promise.all([
        serverApi.getStats(),
        changeLogApi.getAll({ keyword: '' }),
        environmentApi.getAll(),
        cabinetApi.getAll(),
      ]);
      setStats(statsData);
      setRecentLogs(logsData.slice(0, 5));
      // 从 environments 和 cabinets 表直接获取数量
      setEnvironmentCount(envData.length);
      setCabinetCount(cabinetData.length);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const statCards = [
    {
      title: '服务器总数',
      value: stats?.total || 0,
      icon: Server,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: '在线',
      value: stats?.online || 0,
      icon: Activity,
      color: 'text-status-online',
      bgColor: 'bg-status-online/10',
    },
    {
      title: '离线',
      value: stats?.offline || 0,
      icon: ServerCrash,
      color: 'text-status-offline',
      bgColor: 'bg-status-offline/10',
    },
    {
      title: '异动中',
      value: stats?.inTransit || 0,
      icon: Clock,
      color: 'text-status-warning',
      bgColor: 'bg-status-warning/10',
    },
    {
      title: '环境数量',
      value: environmentCount,
      icon: Layers,
      color: 'text-status-online',
      bgColor: 'bg-status-online/10',
    },
    {
      title: '机柜数量',
      value: cabinetCount,
      icon: Database,
      color: 'text-status-warning',
      bgColor: 'bg-status-warning/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">仪表盘</h1>
        <div className="flex gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-background-card border border-background-border rounded-lg text-slate-300 hover:text-white hover:border-primary/50 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-background-card border border-background-border rounded-xl p-5 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{card.title}</p>
                <p className="text-3xl font-bold text-white mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.bgColor} rounded-xl flex items-center justify-center`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 环境分布 */}
        <div className="bg-background-card border border-background-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">环境分布</h2>
          {stats?.byEnvironment && stats.byEnvironment.length > 0 ? (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.byEnvironment}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="environment"
                    labelLine={false}
                    label={({ name, cx, cy, midAngle, outerRadius, value }) => {
                      const RADIAN = Math.PI / 180;
                      // 标签在饼块边缘的起点
                      const startX = cx + (outerRadius + 2) * Math.cos(-midAngle * RADIAN);
                      const startY = cy + (outerRadius + 2) * Math.sin(-midAngle * RADIAN);

                      // 标签在左侧还是右侧（更精确的判断）
                      const isRight = Math.cos(-midAngle * RADIAN) > 0;

                      // 更长的引线长度，让标签远离饼图
                      const lineLength = 60;
                      const horizontalExtension = 15; // 水平延伸线长度
                      const labelRadius = outerRadius + lineLength;
                      const endX = cx + labelRadius * Math.cos(-midAngle * RADIAN);
                      const endY = cy + labelRadius * Math.sin(-midAngle * RADIAN);

                      // 水平延伸后的标签位置
                      const textX = endX + (isRight ? horizontalExtension : -horizontalExtension);

                      return (
                        <g>
                          {/* 放射状引线 - 从饼块边缘到外围 */}
                          <line
                            x1={startX}
                            y1={startY}
                            x2={endX}
                            y2={endY}
                            stroke="#64748B"
                            strokeWidth={1}
                          />
                          {/* 水平延伸线 - 形成"L"形，让标签与斜线分离 */}
                          <line
                            x1={endX}
                            y1={endY}
                            x2={textX}
                            y2={endY}
                            stroke="#64748B"
                            strokeWidth={1}
                          />
                          <text
                            x={textX + (isRight ? 4 : -4)}
                            y={endY}
                            fill="#94A3B8"
                            fontSize={10}
                            textAnchor={isRight ? 'start' : 'end'}
                            dominantBaseline="middle"
                          >
                            {name} ({value})
                          </text>
                        </g>
                      );
                    }}
                  >
                    {stats.byEnvironment.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [`${name}: ${value}`, '数量']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-500">
              暂无数据
            </div>
          )}
        </div>

        {/* 角色分布 */}
        <div className="bg-background-card border border-background-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">角色分布</h2>
          {stats?.byRole && stats.byRole.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byRole.slice(0, 8)} layout="vertical">
                  <XAxis type="number" stroke="#64748B" fontSize={12} />
                  <YAxis 
                    type="category" 
                    dataKey="role" 
                    stroke="#64748B" 
                    fontSize={12} 
                    width={80}
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
            <div className="h-64 flex items-center justify-center text-slate-500">
              暂无数据
            </div>
          )}
        </div>
      </div>

      {/* 机柜使用情况 - U位可视化 */}
      <div className="bg-background-card border border-background-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">机柜U位可视化</h2>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-primary/60 rounded-sm"></div>
              <span className="text-slate-400">空闲</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-primary rounded-sm"></div>
              <span className="text-slate-400">已占用</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500/60 rounded-sm"></div>
              <span className="text-slate-400">高负载</span>
            </div>
          </div>
        </div>
        {stats?.byCabinet && stats.byCabinet.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {stats.byCabinet.slice(0, 12).map((cabinet) => {
              // 根据服务器数量计算U位占用（假设每台服务器平均占用2U）
              const avgUPower = 2;
              const totalU = 42;
              const usedU = cabinet.count * avgUPower;
              const usagePercent = Math.round((usedU / totalU) * 100);
              
              // 根据占用率确定颜色
              const getStatusColor = () => {
                if (usagePercent >= 80) return { bg: 'from-yellow-500/30 to-yellow-600/40', border: 'border-yellow-500/50', text: 'text-yellow-400' };
                if (usagePercent >= 50) return { bg: 'from-primary/40 to-primary/60', border: 'border-primary/50', text: 'text-primary' };
                return { bg: 'from-slate-600/40 to-slate-700/60', border: 'border-slate-500/30', text: 'text-slate-300' };
              };
              const status = getStatusColor();
              
              // 生成U位条
              const uBars = [];
              const serverDistribution = [];
              let remainingU = usedU;
              for (let i = 0; i < 10; i++) {
                if (remainingU >= avgUPower) {
                  serverDistribution.push(1);
                  remainingU -= avgUPower;
                } else if (remainingU > 0) {
                  serverDistribution.push(remainingU / avgUPower);
                  remainingU = 0;
                }
              }
              
              return (
                <div
                  key={cabinet.cabinet}
                  onClick={() => navigate(`/servers?cabinet=${cabinet.cabinet}`)}
                  className="cursor-pointer group"
                >
                  {/* 机柜本体 */}
                  <div className={`
                    relative rounded-lg bg-gradient-to-b ${status.bg} 
                    border ${status.border} p-2 transition-all group-hover:scale-105 group-hover:shadow-lg
                  `}>
                    {/* 机柜顶部边框 */}
                    <div className="absolute top-0 left-2 right-2 h-1 bg-gradient-to-r from-slate-400/30 via-slate-300/50 to-slate-400/30 rounded-t" />
                    
                    {/* U位可视化条 - 垂直条状 */}
                    <div className="mt-2 flex flex-col gap-0.5">
                      {Array.from({ length: 10 }).map((_, i) => {
                        const serverIndex = Math.floor(i / (10 / Math.min(serverDistribution.length, 10)));
                        const serverFill = serverDistribution[serverIndex] || 0;
                        const isOccupied = serverFill > (i % (10 / Math.min(serverDistribution.length || 1, 10)));
                        const fillHeight = Math.max(20, Math.min(100, serverFill * 100));
                        
                        return (
                          <div 
                            key={i}
                            className={`h-2 rounded-sm transition-all ${
                              fillHeight > (i * 10) 
                                ? 'bg-primary/80 shadow-sm' 
                                : 'bg-slate-700/50'
                            }`}
                            style={{ 
                              opacity: fillHeight > (i * 10) ? 0.6 + (fillHeight / 200) : 0.3 
                            }}
                          />
                        );
                      })}
                    </div>
                    
                    {/* 机柜底部信息 */}
                    <div className="mt-2 pt-1 border-t border-slate-600/30">
                      <div className="text-xs text-white truncate font-medium">{cabinet.cabinet}</div>
                      <div className="flex justify-between items-center mt-0.5">
                        <span className={`text-xs ${status.text}`}>{cabinet.count}台</span>
                        <span className={`text-xs ${status.text}`}>{usagePercent}%</span>
                      </div>
                      {/* U位使用条 */}
                      <div className="mt-1 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            usagePercent >= 80 ? 'bg-yellow-500' : usagePercent >= 50 ? 'bg-primary' : 'bg-slate-500'
                          }`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500 text-sm">
            暂无机柜数据
          </div>
        )}
      </div>

      {/* 近期变更 */}
      <div className="bg-background-card border border-background-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">近期变更</h2>
          <button
            onClick={() => navigate('/history')}
            className="text-sm text-primary hover:text-primary/80"
          >
            查看全部
          </button>
        </div>
        {recentLogs.length > 0 ? (
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-3 border-b border-background-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-status-warning/10 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-status-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-white">{log.server_name}</p>
                    <p className="text-xs text-slate-500">
                      {log.change_type}: {log.before_status} → {log.after_status}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">{log.operator}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(log.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">
            暂无变更记录
          </div>
        )}
      </div>
    </div>
  );
}
