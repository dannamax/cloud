import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Server, 
  Activity, 
  AlertTriangle, 
  RefreshCw, 
  ServerCrash,
  Clock,
  Layers,
  Database,
  X,
  Monitor
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { serverApi, changeLogApi, environmentApi, cabinetApi } from '../services/api';
import type { ServerStats, ChangeLog } from '../types';

const COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<ChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [environmentCount, setEnvironmentCount] = useState(0);
  const [cabinetCount, setCabinetCount] = useState(0);
  const [selectedRole, setSelectedRole] = useState<{ role: string; model_name: string } | null>(null);
  const [roleDetailModal, setRoleDetailModal] = useState(false);

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

      {/* 主要内容区域 - 左右分栏 */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* 左侧（3列）- 角色-机型分布 */}
        <div className="xl:col-span-3 space-y-6">
          {/* 角色-机型分布 */}
          <div className="bg-background-card border border-background-border rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-4">角色-机型分布</h2>
            {(() => {
              // 计算角色-机型分布数据
              const roleModelData = stats?.byRoleAndModel && stats.byRoleAndModel.length > 0
                ? stats.byRoleAndModel
                : (stats?.allServers ? (() => {
                    const map = new Map<string, Map<string, number>>();
                    stats.allServers.forEach((s: any) => {
                      const role = s.role || '未分配';
                      const model = `${s.brand || ''} ${s.model || ''}`.trim() || '未知';
                      if (!map.has(role)) map.set(role, new Map());
                      const m = map.get(role)!;
                      m.set(model, (m.get(model) || 0) + 1);
                    });
                    const result: { role: string; model_name: string; count: number }[] = [];
                    map.forEach((models, role) => {
                      models.forEach((count, model_name) => {
                        result.push({ role, model_name, count });
                      });
                    });
                    return result;
                  })() : []);

              if (!roleModelData || roleModelData.length === 0) {
                return (
                  <div className="h-64 flex items-center justify-center text-slate-500">
                    暂无数据
                  </div>
                );
              }

              // 按角色分组
              const roleGroups = new Map<string, { model_name: string; count: number }[]>();
              roleModelData.forEach((item) => {
                if (!roleGroups.has(item.role)) {
                  roleGroups.set(item.role, []);
                }
                roleGroups.get(item.role)!.push({ model_name: item.model_name, count: item.count });
              });

              // 计算最大数量用于进度条
              const maxCount = Math.max(...roleModelData.map(i => i.count));
              const totalRoles = roleGroups.size;
              const totalServers = roleModelData.reduce((sum, i) => sum + i.count, 0);

              return (
                <div className="space-y-4">
                  {/* 统计摘要 */}
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                    <span className="px-2 py-1 rounded bg-slate-800 text-slate-300">
                      共 {totalRoles} 种角色，{totalServers} 台服务器
                    </span>
                  </div>

                  {/* 角色卡片网格 - 3列布局 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from(roleGroups.entries()).map(([role, models]) => {
                      const totalCount = models.reduce((sum, m) => sum + m.count, 0);
                      // 按数量排序
                      const sortedModels = models.sort((a, b) => b.count - a.count);
                      
                      return (
                        <div
                          key={role}
                          className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50 hover:border-primary/30 transition-colors"
                        >
                          {/* 角色标题和总数 */}
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-white font-semibold truncate flex-1 mr-2">{role}</h3>
                            <span
                              onClick={() => {
                                setSelectedRole({ role, model_name: '' });
                                setRoleDetailModal(true);
                              }}
                              className="text-primary text-sm font-medium cursor-pointer hover:text-primary/80 whitespace-nowrap"
                            >
                              共 {totalCount} 台
                            </span>
                          </div>
                          
                          {/* 机型列表 */}
                          <div className="space-y-2">
                            {sortedModels.slice(0, 3).map((model, idx) => {
                              const percent = maxCount > 0 ? Math.round((model.count / maxCount) * 100) : 0;
                              return (
                                <div key={idx} className="group">
                                  <div
                                    onClick={() => {
                                      setSelectedRole({ role, model_name: model.model_name });
                                      setRoleDetailModal(true);
                                    }}
                                    className="flex items-center justify-between text-sm mb-1 cursor-pointer"
                                  >
                                    <span className="text-slate-400 truncate flex-1 mr-3 hover:text-primary transition-colors" title={model.model_name}>
                                      {model.model_name}
                                    </span>
                                    <span className="text-slate-300 font-medium">{model.count}</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all"
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                            {sortedModels.length > 3 && (
                              <div className="text-xs text-slate-500 text-center pt-2">
                                还有 {sortedModels.length - 3} 个机型
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

        </div>

        {/* 右侧（1列）- 环境分布 + 近期变更 */}
        <div className="xl:col-span-1 space-y-6">
          {/* 环境分布 */}
          <div className="bg-background-card border border-background-border rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-4">环境分布</h2>
            {stats?.byEnvironment && stats.byEnvironment.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.byEnvironment}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="environment"
                      labelLine={false}
                      label={({ name, cx, cy, midAngle, outerRadius, value }) => {
                        const RADIAN = Math.PI / 180;
                        const startX = cx + (outerRadius + 2) * Math.cos(-midAngle * RADIAN);
                        const startY = cy + (outerRadius + 2) * Math.sin(-midAngle * RADIAN);
                        const isRight = Math.cos(-midAngle * RADIAN) > 0;
                        const lineLength = 40;
                        const horizontalExtension = 10;
                        const labelRadius = outerRadius + lineLength;
                        const endX = cx + labelRadius * Math.cos(-midAngle * RADIAN);
                        const endY = cy + labelRadius * Math.sin(-midAngle * RADIAN);
                        const textX = endX + (isRight ? horizontalExtension : -horizontalExtension);

                        return (
                          <g>
                            <line x1={startX} y1={startY} x2={endX} y2={endY} stroke="#64748B" strokeWidth={1} />
                            <line x1={endX} y1={endY} x2={textX} y2={endY} stroke="#64748B" strokeWidth={1} />
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
                      {stats.byEnvironment.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">
                暂无数据
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
      </div>

      {/* 角色-机型详情模态框 */}
      {roleDetailModal && selectedRole && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-background-card border border-background-border rounded-xl w-full max-w-5xl max-h-[80vh] flex flex-col">
            {/* 模态框头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-background-border">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-white font-semibold">{selectedRole.role}</h3>
                  <p className="text-sm text-slate-400">
                    {selectedRole.model_name || '全部机型'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setRoleDetailModal(false);
                  setSelectedRole(null);
                }}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* 模态框内容 - 服务器列表 */}
            <div className="flex-1 overflow-auto p-6">
              {(() => {
                // 从 allServers 筛选符合条件的服务器
                // model_name为空表示查看整个角色，否则只看特定机型
                const servers = stats?.allServers?.filter((s: any) => {
                  const role = s.role || '未分配';
                  if (selectedRole.model_name) {
                    // 查看特定机型
                    const model = `${s.brand || ''} ${s.model || ''}`.trim() || '未知';
                    return role === selectedRole.role && model === selectedRole.model_name;
                  } else {
                    // 查看整个角色
                    return role === selectedRole.role;
                  }
                }) || [];

                if (servers.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500">
                      暂无服务器数据
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">系统IP</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">管理IP</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">厂商型号</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">归属环境</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">机柜位置</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">状态</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">SN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {servers.map((server: any, idx: number) => (
                          <tr
                            key={server.id || idx}
                            className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="py-3 px-4 text-white font-mono">{server.system_ip || '-'}</td>
                            <td className="py-3 px-4 text-slate-300 font-mono">{server.manage_ip || '-'}</td>
                            <td className="py-3 px-4 text-slate-300">{`${server.brand || ''} ${server.model || ''}`.trim() || '-'}</td>
                            <td className="py-3 px-4 text-slate-300">{server.environment || '-'}</td>
                            <td className="py-3 px-4 text-slate-300">
                              {server.cabinet ? `${server.cabinet} U${server.u_position || '-'}` : '-'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                                server.online_status === 'online'
                                  ? 'bg-green-500/20 text-green-400'
                                  : server.online_status === 'offline'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {server.online_status === 'online' ? '在线' : server.online_status === 'offline' ? '离线' : '未知'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400 font-mono text-xs">{server.sn || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* 模态框底部 */}
            <div className="px-6 py-3 border-t border-background-border text-sm text-slate-400">
              共 {stats?.allServers?.filter((s: any) => {
                const role = s.role || '未分配';
                return role === selectedRole.role;
              }).length || 0} 台服务器
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
