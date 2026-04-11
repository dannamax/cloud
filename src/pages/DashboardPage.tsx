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
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
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
          {/* 角色-机型分布 - 热力图矩阵视图 */}
          <div className="bg-background-card border border-background-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">角色-机型分布</h2>
              <span className="text-xs text-slate-500">点击单元格查看服务器详情</span>
            </div>
            {(() => {
              // 构建数据：从 allServers 聚合
              if (!stats?.allServers || stats.allServers.length === 0) {
                return (
                  <div className="h-64 flex items-center justify-center text-slate-500">
                    暂无数据
                  </div>
                );
              }

              // 聚合机型-角色数据
              const modelRoleMap = new Map<string, Map<string, number>>();
              const roleSet = new Set<string>();
              const modelSet = new Set<string>();
              
              stats.allServers.forEach((s: any) => {
                const role = s.role || '未分配';
                const model = `${s.brand || ''} ${s.model || ''}`.trim() || '未知';
                roleSet.add(role);
                modelSet.add(model);
                
                if (!modelRoleMap.has(model)) modelRoleMap.set(model, new Map());
                const roleMap = modelRoleMap.get(model)!;
                roleMap.set(role, (roleMap.get(role) || 0) + 1);
              });

              // 排序：机型按总数降序，角色按总数降序
              const modelTotals = new Map<string, number>();
              modelRoleMap.forEach((roleMap, model) => {
                let total = 0;
                roleMap.forEach(count => total += count);
                modelTotals.set(model, total);
              });

              const sortedModels = Array.from(modelTotals.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 12)  // 最多显示12种机型
                .map(([m]) => m);

              // 找出最大数量用于计算颜色深度
              let maxCount = 0;
              modelRoleMap.forEach(roleMap => {
                roleMap.forEach(count => {
                  if (count > maxCount) maxCount = count;
                });
              });

              // 计算每种机型的角色分布
              const getModelDistribution = (model: string) => {
                const roleMap = modelRoleMap.get(model) || new Map();
                const dist: { role: string; count: number; percent: number }[] = [];
                let total = 0;
                roleMap.forEach((count, role) => {
                  total += count;
                  dist.push({ role, count, percent: 0 });
                });
                dist.forEach(d => {
                  d.percent = total > 0 ? Math.round((d.count / total) * 100) : 0;
                });
                return { dist: dist.sort((a, b) => b.count - a.count), total };
              };

              // 颜色渐变函数
              const getHeatColor = (count: number, total: number) => {
                if (count === 0 || total === 0) return 'bg-slate-800/30';
                const intensity = count / maxCount;
                if (intensity > 0.7) return 'bg-primary text-white';
                if (intensity > 0.4) return 'bg-primary/70 text-white';
                if (intensity > 0.2) return 'bg-primary/40 text-white';
                return 'bg-primary/20 text-slate-300';
              };

              const getBarColor = (count: number, total: number) => {
                if (total === 0) return 'bg-slate-700';
                const ratio = count / total;
                if (ratio > 0.6) return 'bg-green-500';
                if (ratio > 0.3) return 'bg-blue-500';
                if (ratio > 0.1) return 'bg-yellow-500';
                return 'bg-slate-500';
              };

              return (
                <div className="space-y-4">
                  {/* 图例 */}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>图例：占比</span>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-slate-700"></div>
                      <span>&lt;10%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-primary/20"></div>
                      <span>10-20%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-primary/40"></div>
                      <span>20-40%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-primary/70"></div>
                      <span>40-70%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-primary"></div>
                      <span>&gt;70%</span>
                    </div>
                  </div>

                  {/* 机型卡片列表 - 堆叠条形图形式 */}
                  <div className="space-y-3">
                    {sortedModels.map(model => {
                      const { dist, total } = getModelDistribution(model);
                      if (total === 0) return null;
                      
                      return (
                        <div
                          key={model}
                          className="group cursor-pointer"
                          onClick={() => {
                            setSelectedRole({ role: '', model_name: model });
                            setRoleDetailModal(true);
                          }}
                        >
                          <div className="flex items-center mb-2">
                            <div className="w-40 text-sm text-slate-300 truncate pr-3" title={model}>
                              {model}
                            </div>
                            <div className="flex-1 h-8 bg-slate-800/50 rounded-lg overflow-hidden flex">
                              {dist.map((item, idx) => {
                                const width = (item.count / total) * 100;
                                return (
                                  <div
                                    key={item.role}
                                    className={`h-full flex items-center justify-center text-xs font-medium transition-all hover:brightness-125 ${getHeatColor(item.count, total)}`}
                                    style={{ width: `${width}%`, minWidth: width > 0 ? '24px' : '0' }}
                                    title={`${item.role}: ${item.count}台 (${item.percent}%)`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedRole({ role: item.role, model_name: model });
                                      setRoleDetailModal(true);
                                    }}
                                  >
                                    {width > 8 ? item.count : ''}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="w-16 text-right text-sm text-slate-400 pl-3">
                              {total}台
                            </div>
                          </div>
                          {/* 角色标签 */}
                          <div className="flex items-center gap-2 ml-40">
                            {dist.slice(0, 5).map((item, idx) => (
                              <div
                                key={item.role}
                                className="flex items-center gap-1 text-xs"
                              >
                                <div className={`w-2 h-2 rounded-full ${getBarColor(item.count, total)}`}></div>
                                <span className="text-slate-500">{item.role}</span>
                                <span className="text-slate-400">({item.percent}%)</span>
                              </div>
                            ))}
                            {dist.length > 5 && (
                              <span className="text-xs text-slate-500">+{dist.length - 5}个角色</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 底部统计 */}
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      共 {sortedModels.length} 种机型，覆盖 {stats.allServers.length} 台服务器
                    </span>
                    <span
                      className="text-primary hover:text-primary/80 cursor-pointer"
                      onClick={() => navigate('/servers')}
                    >
                      查看全部服务器 →
                    </span>
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
                  <h3 className="text-white font-semibold">
                    {selectedRole.role ? `角色: ${selectedRole.role}` : '所有角色'}
                    {selectedRole.model_name && ` / 机型: ${selectedRole.model_name}`}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {selectedRole.role && selectedRole.model_name ? '筛选条件' : selectedRole.model_name ? '查看该机型所有服务器' : '查看该角色所有服务器'}
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
                const servers = stats?.allServers?.filter((s: any) => {
                  const serverRole = s.role || '未分配';
                  const serverModel = `${s.brand || ''} ${s.model || ''}`.trim() || '未知';
                  
                  // 机型筛选
                  const matchModel = !selectedRole.model_name || serverModel === selectedRole.model_name;
                  // 角色筛选（当role不为空时才筛选角色）
                  const matchRole = !selectedRole.role || serverRole === selectedRole.role;
                  
                  return matchModel && matchRole;
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
            <div className="px-6 py-3 border-t border-background-border text-sm text-slate-400 flex items-center justify-between">
              <span>
                共 {stats?.allServers?.filter((s: any) => {
                  const serverRole = s.role || '未分配';
                  const serverModel = `${s.brand || ''} ${s.model || ''}`.trim() || '未知';
                  const matchModel = !selectedRole.model_name || serverModel === selectedRole.model_name;
                  const matchRole = !selectedRole.role || serverRole === selectedRole.role;
                  return matchModel && matchRole;
                }).length || 0} 台服务器
              </span>
              <button
                onClick={() => navigate('/servers')}
                className="text-primary hover:text-primary/80"
              >
                跳转至服务器页面 →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
