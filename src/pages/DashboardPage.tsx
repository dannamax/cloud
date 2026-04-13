import { useEffect, useState, useMemo, useCallback, memo } from 'react';
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
  const [selectedRole, setSelectedRole] = useState<{ role: string; model_name: string; brand?: string } | null>(null);
  const [roleDetailModal, setRoleDetailModal] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'brand' | 'product'>('brand'); // 厂商视角 / 产品视角
  const [selectedProductRole, setSelectedProductRole] = useState<string>(''); // 选中的产品角色

  // 优化：使用 useCallback 缓存点击处理器
  const handleCellClick = useCallback((role: string, model: string, brand: string) => {
    setSelectedRole({ role, model_name: model, brand });
    setRoleDetailModal(true);
  }, []);

  // 产品视角专用回调 - 不需要 brand 参数
  const handleProductCellClick = useCallback((role: string, model: string) => {
    setSelectedRole({ role, model_name: model, brand: '' });
    setRoleDetailModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setRoleDetailModal(false);
    setSelectedRole(null);
  }, []);

  // 初始化默认选中的厂商和型号
  useEffect(() => {
    if (stats?.allServers && stats.allServers.length > 0 && !selectedBrand) {
      const tempMap = new Map<string, number>();
      stats.allServers.forEach((s: any) => {
        const brand = (s.brand || '').trim() || '未知';
        tempMap.set(brand, (tempMap.get(brand) || 0) + 1);
      });
      const brands = Array.from(tempMap.keys()).sort();
      if (brands.length > 0) {
        setSelectedBrand(brands[0]);
        setSelectedModel('全部');
      }
    }
  }, [stats, selectedBrand]);

  // 聚合厂商-型号-角色数据
  const brandModelMap = useMemo(() => {
    const map = new Map<string, Map<string, Map<string, number>>>();
    if (!stats?.allServers) return map;
    
    stats.allServers.forEach((s: any) => {
      const role = s.role || '未分配';
      const brand = (s.brand || '').trim() || '未知';
      const model = (s.model || '').trim() || '未知';
      
      if (!map.has(brand)) map.set(brand, new Map());
      const modelMap = map.get(brand)!;
      
      if (!modelMap.has(model)) modelMap.set(model, new Map());
      const roleMap = modelMap.get(model)!;
      roleMap.set(role, (roleMap.get(role) || 0) + 1);
    });
    return map;
  }, [stats]);

  // 获取所有厂商列表
  const brands = useMemo(() => {
    return Array.from(brandModelMap.keys())
      .sort()
      .map(brand => {
        let total = 0;
        brandModelMap.get(brand)?.forEach(roleMap => {
          roleMap.forEach(count => total += count);
        });
        return { name: brand, total };
      });
  }, [brandModelMap]);

  // 获取选中厂商的型号列表
  const currentModels = useMemo(() => {
    const modelMap = brandModelMap.get(selectedBrand) || new Map();
    return Array.from(modelMap.entries())
      .map(([model, roleMap]) => {
        let total = 0;
        roleMap.forEach((count: number) => total += count);
        return { name: model, total };
      })
      .sort((a, b) => b.total - a.total);
  }, [brandModelMap, selectedBrand]);

  // 计算选中型号的角色分布
  const modelDistribution = useMemo(() => {
    if (!selectedBrand || !selectedModel) return { dist: [] as { role: string; count: number; percent: number }[], total: 0 };
    
    let roleMap: Map<string, number>;
    
    if (selectedModel === '全部') {
      roleMap = new Map();
      const modelMapData = brandModelMap.get(selectedBrand);
      if (modelMapData) {
        modelMapData.forEach((rm) => {
          rm.forEach((count, role) => {
            roleMap.set(role, (roleMap.get(role) || 0) + count);
          });
        });
      }
    } else {
      roleMap = brandModelMap.get(selectedBrand)?.get(selectedModel) || new Map();
    }
    
    const normalizeRole = (role: string): string[] => {
      return role.split('/').map(s => s.trim()).filter(Boolean).sort();
    };
    
    const getBaseRole = (role: string): string => {
      const parts = normalizeRole(role);
      return parts.length === 0 ? '未知' : parts[0];
    };
    
    const getSubRoles = (role: string): Set<string> => {
      const parts = normalizeRole(role);
      return new Set(parts.slice(1));
    };
    
    const byBaseRole = new Map<string, { count: number; subRoles: Map<string, number>; rawRoles: string[] }>();
    
    roleMap.forEach((count, role) => {
      const baseRole = getBaseRole(role);
      const subRoles = getSubRoles(role);
      
      if (!byBaseRole.has(baseRole)) {
        byBaseRole.set(baseRole, { count: 0, subRoles: new Map(), rawRoles: [] });
      }
      
      const entry = byBaseRole.get(baseRole)!;
      entry.count += count;
      entry.rawRoles.push(role);
      
      subRoles.forEach(sub => {
        entry.subRoles.set(sub, (entry.subRoles.get(sub) || 0) + count);
      });
    });
    
    const dist: { role: string; count: number; percent: number }[] = [];
    let total = 0;
    
    byBaseRole.forEach((entry, baseRole) => {
      total += entry.count;
      
      if (entry.subRoles.size > 0) {
        const subParts: string[] = [];
        entry.subRoles.forEach((subCount, sub) => {
          const subPercent = (subCount / entry.count) * 100;
          if (subPercent >= 10) {
            subParts.push(sub);
          }
        });
        const displayRole = subParts.length > 0 
          ? `${baseRole}/${subParts.join('/')}`
          : baseRole;
        dist.push({ role: displayRole, count: entry.count, percent: 0 });
      } else {
        dist.push({ role: baseRole, count: entry.count, percent: 0 });
      }
    });
    
    dist.forEach(d => {
      d.percent = total > 0 ? Math.round((d.count / total) * 100) : 0;
    });
    
    return { dist: dist.sort((a, b) => b.count - a.count), total };
  }, [brandModelMap, selectedBrand, selectedModel]);

  // 缓存饼图数据
  const pieData = useMemo(() => {
    const pieColors = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#D946EF'];
    return modelDistribution.dist.map((item, idx) => ({
      ...item,
      color: pieColors[idx % pieColors.length]
    }));
  }, [modelDistribution.dist]);

  // 获取产品视角的所有角色列表
  const productRoles = useMemo(() => {
    const roleMap = new Map<string, number>();
    stats?.allServers?.forEach((s: any) => {
      const role = (s.role || '未分配').split('/')[0].trim();
      if (role) {
        roleMap.set(role, (roleMap.get(role) || 0) + 1);
      }
    });
    return Array.from(roleMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [stats]);

  // 切换到产品视角时，自动选中第一个角色
  const handleSwitchToProductView = useCallback(() => {
    if (productRoles.length > 0 && !selectedProductRole) {
      setSelectedProductRole(productRoles[0].name);
    }
    setViewMode('product');
  }, [productRoles, selectedProductRole]);

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
      onClick: () => navigate('/servers'),
    },
    {
      title: '在线',
      value: stats?.online || 0,
      icon: Activity,
      color: 'text-status-online',
      bgColor: 'bg-status-online/10',
      onClick: () => navigate('/servers?status=online'),
    },
    {
      title: '离线',
      value: stats?.offline || 0,
      icon: ServerCrash,
      color: 'text-status-offline',
      bgColor: 'bg-status-offline/10',
      onClick: () => navigate('/servers?status=offline'),
    },
    {
      title: '异动中',
      value: stats?.inTransit || 0,
      icon: Clock,
      color: 'text-status-warning',
      bgColor: 'bg-status-warning/10',
      onClick: () => navigate('/servers'),
    },
    {
      title: '环境数量',
      value: environmentCount,
      icon: Layers,
      color: 'text-status-online',
      bgColor: 'bg-status-online/10',
      onClick: () => navigate('/servers'),
    },
    {
      title: '机柜数量',
      value: cabinetCount,
      icon: Database,
      color: 'text-status-warning',
      bgColor: 'bg-status-warning/10',
      onClick: () => navigate('/servers'),
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
            onClick={card.onClick}
            className="bg-background-card border border-background-border rounded-xl p-5 hover:border-primary/30 transition-colors cursor-pointer"
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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* 左侧（2列）- 角色-机型分布 */}
        <div className="xl:col-span-2 space-y-6">
          {/* 角色-机型分布 - 厂商/型号下拉 + 饼图视图 */}
          <div className="bg-background-card border border-background-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">角色-机型分布</h2>
              <div className="flex items-center gap-4">
                <div className="flex bg-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('brand')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      viewMode === 'brand' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    厂商视角
                  </button>
                  <button
                    onClick={handleSwitchToProductView}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      viewMode === 'product' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    产品视角
                  </button>
                </div>
                <span className="text-xs text-slate-500">点击连接线查看服务器详情</span>
              </div>
            </div>
            {stats?.allServers && stats.allServers.length > 0 ? (
              <div className="space-y-4">
                {viewMode === 'brand' ? (
                /* 厂商视角 - 带左侧厂商列表 */
                <div className="flex gap-4">
                  {/* 左侧厂商列表 */}
                  <div className="w-56 shrink-0">
                    <div className="text-sm text-slate-400 mb-2">点击厂商查看机型：</div>
                    <div className="space-y-1">
                      {brands.map((brand) => {
                        const isExpanded = expandedBrands.has(brand.name);
                        const brandModels = currentModels;
                        const isSelected = selectedBrand === brand.name;
                        
                        return (
                          <div key={brand.name}>
                            <div
                              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                                isSelected ? 'bg-primary/20 border border-primary/50' : 'hover:bg-slate-800'
                              }`}
                              onClick={() => {
                                setSelectedBrand(brand.name);
                                setSelectedModel('全部');
                                setExpandedBrands(prev => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(brand.name)) {
                                    newSet.delete(brand.name);
                                  } else {
                                    newSet.add(brand.name);
                                  }
                                  return newSet;
                                });
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`text-sm ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                  {brand.name}
                                </span>
                                <span className="text-xs text-slate-500">{brand.total}台</span>
                              </div>
                              <span className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                ▶
                              </span>
                            </div>
                            {/* 机型列表 */}
                            {isExpanded && (
                              <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-3">
                                <div
                                  className={`text-xs px-2 py-1 rounded cursor-pointer transition-all ${
                                    selectedBrand === brand.name && selectedModel === '全部'
                                      ? 'bg-primary/30 text-white'
                                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBrand(brand.name);
                                    setSelectedModel('全部');
                                  }}
                                >
                                  全部 ({brand.total})
                                </div>
                                {brandModels.map((model) => (
                                  <div
                                    key={model.name}
                                    className={`text-xs px-2 py-1 rounded cursor-pointer transition-all ${
                                      selectedBrand === brand.name && selectedModel === model.name
                                        ? 'bg-primary/30 text-white'
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedBrand(brand.name);
                                      setSelectedModel(model.name);
                                      setExpandedBrands(prev => new Set([...prev, brand.name]));
                                    }}
                                  >
                                    {model.name} ({model.total})
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 右侧饼图 - 使用独立组件避免重新渲染 */}
                  <div className="flex-1 flex flex-col">
                    <BrandPieChart
                      pieData={pieData}
                      selectedBrand={selectedBrand}
                      selectedModel={selectedModel}
                      total={modelDistribution.total}
                      onCellClick={handleCellClick}
                    />
                  </div>
                </div>
                ) : (
                /* 产品视角 - 按角色查看机型分布 */
                <div className="flex gap-4">
                  {/* 左侧角色列表 */}
                  <div className="w-56 shrink-0">
                    <div className="text-sm text-slate-400 mb-2">选择产品角色：</div>
                    <div className="space-y-1">
                      <ProductRolesList 
                        roles={productRoles} 
                        selectedProductRole={selectedProductRole}
                        onSelectRole={setSelectedProductRole}
                      />
                    </div>
                  </div>

                  {/* 右侧饼图 - 显示选中角色的机型分布 */}
                  <div className="flex-1 flex flex-col">
                    <ProductPieChart 
                      stats={stats} 
                      selectedProductRole={selectedProductRole} 
                      onCellClick={handleProductCellClick}
                    />
                  </div>
                </div>
                )}

                {/* 底部统计 */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    {viewMode === 'brand' ? (
                      selectedModel === '全部' 
                        ? `${selectedBrand} 全部型号 ${modelDistribution.total} 台服务器，${modelDistribution.dist.length} 种角色`
                        : `${selectedBrand} - ${selectedModel} ${modelDistribution.total} 台服务器，${modelDistribution.dist.length} 种角色`
                    ) : (
                      `${selectedProductRole} 角色 ${
                        stats?.allServers?.filter((s: any) => (s.role || '未分配').split('/')[0].trim() === selectedProductRole).length || 0
                      } 台服务器`
                    )}
                  </span>
                  <span
                    className="text-primary hover:text-primary/80 cursor-pointer"
                    onClick={() => navigate('/servers')}
                  >
                    查看全部服务器 →
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">
                暂无数据
              </div>
            )}
          </div>
        </div>

        {/* 右侧（1列）- 环境分布 + 近期变更 */}
        <div className="xl:col-span-1 space-y-6 w-full">
          {/* 环境分布 */}
          <div className="bg-background-card border border-background-border rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-4">环境分布</h2>
            {stats?.byEnvironment && stats.byEnvironment.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 100, bottom: 20, left: 100 }}>
                    <Pie
                      data={stats.byEnvironment}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="environment"
                      labelLine={false}
                      label={({ name, cx, cy, midAngle, outerRadius, value }) => {
                        const RADIAN = Math.PI / 180;
                        const startX = cx + (outerRadius + 2) * Math.cos(-midAngle * RADIAN);
                        const startY = cy + (outerRadius + 2) * Math.sin(-midAngle * RADIAN);
                        const isRight = Math.cos(-midAngle * RADIAN) > 0;
                        const lineLength = 60;
                        const horizontalExtension = 20;
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
                    {selectedRole.brand && `厂商: ${selectedRole.brand} / `}
                    {selectedRole.role ? `角色: ${selectedRole.role}` : '所有角色'}
                    {selectedRole.model_name && ` / 机型: ${selectedRole.model_name}`}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {selectedRole.brand && `${selectedRole.brand} - `}
                    {selectedRole.model_name && selectedRole.model_name !== '全部' ? `${selectedRole.model_name} - ` : ''}
                    {selectedRole.role ? `角色: ${selectedRole.role}` : '所有角色'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
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
                  const serverBrand = (s.brand || '').trim();
                  const serverRole = s.role || '未分配';
                  const serverModel = (s.model || '').trim();
                  
                  // 厂商筛选
                  const matchBrand = !selectedRole.brand || serverBrand === selectedRole.brand;
                  // 机型筛选（匹配型号）
                  let matchModel = true;
                  if (selectedRole.model_name && selectedRole.model_name !== '全部') {
                    // 机型显示格式为 "品牌 型号"，提取型号部分进行匹配
                    const targetFullModel = selectedRole.model_name;
                    const targetParts = targetFullModel.split(' ').filter(p => p);
                    const targetModelPart = (targetParts[targetParts.length - 1] || '').trim();
                    
                    // 型号匹配：精确匹配
                    matchModel = serverModel === targetModelPart;
                  }
                  
                  // 角色筛选逻辑
                  let matchRole = true;
                  if (selectedRole.role) {
                    // 饼图中的角色名（可能是基础角色如 "kvm"）
                    const targetRole = selectedRole.role;
                    // 服务器角色可能是 "kvm/web" 或 "kvm" 格式
                    const serverBaseRole = serverRole.split('/')[0].trim();
                    
                    // 精确匹配基础角色，或者服务器角色完全匹配目标角色
                    matchRole = serverBaseRole === targetRole || serverRole === targetRole;
                  }
                  
                  return matchBrand && matchModel && matchRole;
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
                  const serverBrand = (s.brand || '').trim();
                  const serverRole = s.role || '未分配';
                  const serverModel = (s.model || '').trim();
                  
                  const matchBrand = !selectedRole.brand || serverBrand === selectedRole.brand;
                  
                  let matchModel = true;
                  if (selectedRole.model_name && selectedRole.model_name !== '全部') {
                    const targetFullModel = selectedRole.model_name;
                    const targetParts = targetFullModel.split(' ').filter(p => p);
                    const targetModelPart = (targetParts[targetParts.length - 1] || '').trim();
                    matchModel = serverModel === targetModelPart;
                  }
                  
                  let matchRole = true;
                  if (selectedRole.role) {
                    const roleParts = selectedRole.role.split('/');
                    const serverBaseRole = serverRole.split('/')[0];
                    matchRole = roleParts.includes(serverBaseRole);
                  }
                  
                  return matchBrand && matchModel && matchRole;
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

// 产品视角饼图组件 - 使用 memo 避免不必要的重新渲染
interface ProductPieChartProps {
  stats: any; 
  selectedProductRole: string; 
  onCellClick: (role: string, model: string) => void;
}

function ProductPieChartInner({ 
  stats, 
  selectedProductRole, 
  onCellClick 
}: ProductPieChartProps) {
  // 使用 useMemo 缓存机型分布数据
  const { productModelDist, total } = useMemo(() => {
    const modelMap = new Map<string, number>();
    stats.allServers.forEach((s: any) => {
      const role = (s.role || '未分配').split('/')[0].trim();
      if (role === selectedProductRole) {
        const model = ((s.brand || '') + ' ' + (s.model || '')).trim() || '未知';
        modelMap.set(model, (modelMap.get(model) || 0) + 1);
      }
    });
    const totalCount = Array.from(modelMap.values()).reduce((a, b) => a + b, 0);
    const dist = Array.from(modelMap.entries())
      .map(([name, count]) => ({ name, count, percent: Math.round((count / totalCount) * 100) || 0 }))
      .sort((a, b) => b.count - a.count);
    return { productModelDist: dist, total: totalCount };
  }, [stats, selectedProductRole]);

  const colors = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  return (
    <>
      {/* 饼图容器 */}
      <div className="h-[24rem] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={productModelDist}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={60}
              paddingAngle={2}
              dataKey="count"
              labelLine={true}
              label={({ name, percent, count, cx, cy, midAngle, outerRadius }) => {
                const RADIAN = Math.PI / 180;
                const startX = cx + (outerRadius + 5) * Math.cos(-midAngle * RADIAN);
                const startY = cy + (outerRadius + 5) * Math.sin(-midAngle * RADIAN);
                const isRight = Math.cos(-midAngle * RADIAN) > 0;
                const lineLength = 80;
                const labelRadius = outerRadius + lineLength;
                const endX = cx + labelRadius * Math.cos(-midAngle * RADIAN);
                const endY = cy + labelRadius * Math.sin(-midAngle * RADIAN);
                const textX = endX + (isRight ? 8 : -8);
                
                return (
                  <g>
                    <line x1={startX} y1={startY} x2={endX} y2={endY} stroke="#64748B" strokeWidth={1} />
                    <text
                      x={textX}
                      y={endY}
                      fill="#94A3B8"
                      fontSize={11}
                      textAnchor={isRight ? 'start' : 'end'}
                      dominantBaseline="middle"
                    >
                      {name}: {count}台 ({percent}%)
                    </text>
                  </g>
                );
              }}
            >
              {productModelDist.map((item, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={colors[index % colors.length]}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => onCellClick(selectedProductRole, item.name)}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* 中心汇总内容 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#94A3B8', 
            fontSize: '10px', 
            textAlign: 'center',
            width: '80px',
            height: '70px'
          }}>
            <div>角色</div>
            <div style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{selectedProductRole}</div>
            <div style={{ marginTop: '4px' }}>共</div>
            <div style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{total} 台</div>
          </div>
        </div>
      </div>
      {/* 饼图下方数据表格 */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3 text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  机型
                </span>
              </th>
              <th className="text-right py-2 px-3 text-slate-400 font-medium">数量</th>
              <th className="text-right py-2 px-3 text-slate-400 font-medium">占比</th>
            </tr>
          </thead>
          <tbody>
            {productModelDist.map((item, idx) => (
              <tr 
                key={idx} 
                className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer"
                onClick={() => onCellClick(selectedProductRole, item.name)}
              >
                <td className="py-2 px-3">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></span>
                    <span className="text-slate-300">{item.name}</span>
                  </span>
                </td>
                <td className="py-2 px-3 text-right text-white">{item.count}</td>
                <td className="py-2 px-3 text-right text-slate-400">{item.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// 使用 memo 包装组件，避免不必要的重新渲染
const ProductPieChart = memo(ProductPieChartInner);

// 厂商视角饼图组件 - 完全独立，避免任何不必要的重新渲染
interface BrandPieChartProps {
  pieData: { role: string; count: number; percent: number; color: string }[];
  selectedBrand: string;
  selectedModel: string;
  total: number;
  onCellClick: (role: string, model: string, brand: string) => void;
}

function BrandPieChartInner({ pieData, selectedBrand, selectedModel, total, onCellClick }: BrandPieChartProps) {
  const colors = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#D946EF'];

  return (
    <>
      {/* 饼图容器 */}
      <div className="h-[24rem] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={65}
              paddingAngle={2}
              dataKey="count"
              labelLine={true}
              label={({ role, percent, count, cx, cy, midAngle, outerRadius }) => {
                const RADIAN = Math.PI / 180;
                const startX = cx + (outerRadius + 5) * Math.cos(-midAngle * RADIAN);
                const startY = cy + (outerRadius + 5) * Math.sin(-midAngle * RADIAN);
                const isRight = Math.cos(-midAngle * RADIAN) > 0;
                const lineLength = 80;
                const labelRadius = outerRadius + lineLength;
                const endX = cx + labelRadius * Math.cos(-midAngle * RADIAN);
                const endY = cy + labelRadius * Math.sin(-midAngle * RADIAN);
                const textX = endX + (isRight ? 8 : -8);
                
                return (
                  <g>
                    <line x1={startX} y1={startY} x2={endX} y2={endY} stroke="#64748B" strokeWidth={1} />
                    <text
                      x={textX}
                      y={endY}
                      fill="#94A3B8"
                      fontSize={11}
                      textAnchor={isRight ? 'start' : 'end'}
                      dominantBaseline="middle"
                    >
                      {role}: {count}台 ({percent}%)
                    </text>
                  </g>
                );
              }}
            >
              {pieData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => onCellClick(entry.role, selectedModel, selectedBrand)}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* 中心汇总内容 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#94A3B8', 
            fontSize: '10px', 
            textAlign: 'center',
            width: '100px',
            height: '80px'
          }}>
            <div>{selectedBrand}</div>
            <div style={{ color: '#fff', fontSize: '11px' }}>{selectedModel}</div>
            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold', marginTop: '4px' }}>{total}</div>
          </div>
        </div>
      </div>
      {/* 饼图下方数据表格 */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3 text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  角色
                </span>
              </th>
              <th className="text-right py-2 px-3 text-slate-400 font-medium">数量</th>
              <th className="text-right py-2 px-3 text-slate-400 font-medium">占比</th>
            </tr>
          </thead>
          <tbody>
            {pieData.map((item, idx) => (
              <tr 
                key={idx} 
                className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer"
                onClick={() => onCellClick(item.role, '', selectedBrand)}
              >
                <td className="py-2 px-3">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></span>
                    <span className="text-slate-300">{item.role}</span>
                  </span>
                </td>
                <td className="py-2 px-3 text-right text-white">{item.count}</td>
                <td className="py-2 px-3 text-right text-slate-400">{item.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const BrandPieChart = memo(BrandPieChartInner);

// 产品视角角色列表组件
interface ProductRolesListProps {
  roles: { name: string; total: number }[];
  selectedProductRole: string;
  onSelectRole: (role: string) => void;
}

function ProductRolesListInner({ roles, selectedProductRole, onSelectRole }: ProductRolesListProps) {
  if (roles.length === 0) {
    return <div className="text-slate-500 text-sm">暂无角色数据</div>;
  }

  return (
    <>
      {roles.map((role) => (
        <div
          key={role.name}
          className={`px-3 py-2 rounded-lg cursor-pointer transition-all ${
            selectedProductRole === role.name
              ? 'bg-primary/20 border border-primary/50'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
          onClick={() => onSelectRole(role.name)}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm">{role.name}</span>
            <span className="text-xs text-slate-500">{role.total}台</span>
          </div>
        </div>
      ))}
    </>
  );
}

const ProductRolesList = memo(ProductRolesListInner);
