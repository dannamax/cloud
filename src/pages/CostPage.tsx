import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Server,
  Building2,
  TrendingDown,
  Clock,
  PieChart,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { costApi, type CostOverview, type CabinetCostDetail, type EnvironmentCostDetail } from '../services/api';

export function CostPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<CostOverview | null>(null);
  const [cabinetCosts, setCabinetCosts] = useState<CabinetCostDetail[]>([]);
  const [envCosts, setEnvCosts] = useState<EnvironmentCostDetail[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'cabinet' | 'environment'>('overview');
  const [selectedEnv, setSelectedEnv] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewData, cabinetData, envData] = await Promise.all([
        costApi.getOverview(),
        costApi.getCabinetCosts(selectedEnv || undefined),
        costApi.getByEnvironment(),
      ]);
      setOverview(overviewData);
      setCabinetCosts(cabinetData);
      setEnvCosts(envData);
    } catch (error) {
      console.error('获取成本数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedEnv]);

  // 收集所有环境选项
  const environments = useMemo(() => {
    if (!overview) return [];
    const envs = new Set<string>();
    overview.cabinetCosts.forEach(c => envs.add(c.environment));
    return Array.from(envs).sort();
  }, [overview]);

  // 格式化金额
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // 折旧进度条颜色
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-red-500';
    if (progress >= 75) return 'bg-amber-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="text-center py-12 text-slate-400">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
        <p>获取成本数据失败</p>
        <button onClick={fetchData} className="mt-4 text-primary hover:underline">
          重试
        </button>
      </div>
    );
  }

  const { summary } = overview;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
          <DollarSign className="w-7 h-7 text-green-400" />
          成本管理
        </h1>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-background-card border border-background-border rounded-lg text-slate-300 hover:text-white hover:border-primary/50 transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      {/* 折旧说明 */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-200">
          <p className="font-medium text-blue-400 mb-1">折旧规则</p>
          <p>• 设备折旧：采购价按 4 年平均折旧，4 年后残值为 0</p>
          <p>• 机柜占用费：每个已上架服务器每年 4,000 元</p>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 总采购价值 */}
        <div className="bg-background-card border border-background-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Server className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-slate-400">设备总采购价</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(summary.deviceCost.totalPurchasePrice)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {summary.deviceCost.serversWithPrice} / {summary.deviceCost.totalServers} 台设备有采购价
          </p>
        </div>

        {/* 当前残值 */}
        <div className="bg-background-card border border-background-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm text-slate-400">设备当前残值</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(summary.deviceCost.totalResidualValue)}</p>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>已折旧 {summary.deviceCost.depreciationProgress}%</span>
            </div>
            <div className="h-1.5 bg-background rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(summary.deviceCost.depreciationProgress)} transition-all`}
                style={{ width: `${Math.min(summary.deviceCost.depreciationProgress, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 已折旧金额 */}
        <div className="bg-background-card border border-background-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-sm text-slate-400">已折旧金额</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(summary.deviceCost.totalDepreciatedValue)}</p>
          <p className="text-xs text-slate-500 mt-1">4年线性折旧</p>
        </div>

        {/* 机柜年费 */}
        <div className="bg-background-card border border-background-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-sm text-slate-400">机柜年占用费</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">{formatCurrency(summary.cabinetCost.totalAnnualFee)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {summary.cabinetCost.totalServers} 台 / {summary.cabinetCost.totalCabinets} 个机柜
          </p>
        </div>
      </div>

      {/* 总成本概览 */}
      <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300 mb-1">年度总成本</p>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(summary.deviceCost.totalResidualValue + summary.cabinetCost.totalAnnualFee)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              设备残值 + 机柜年费（每月 {formatCurrency((summary.deviceCost.totalResidualValue + summary.cabinetCost.totalAnnualFee) / 12)}）
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-300 mb-1">累计投入</p>
            <p className="text-2xl font-bold text-slate-300">
              {formatCurrency(summary.totalCost.totalInvested)}
            </p>
            <p className="text-xs text-slate-400 mt-1">采购价 + 历史机柜费</p>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="bg-background-card border border-background-border rounded-xl overflow-hidden">
        <div className="border-b border-background-border flex">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PieChart className="w-4 h-4 inline mr-2" />
            设备折旧明细
          </button>
          <button
            onClick={() => setActiveTab('cabinet')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'cabinet'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            机柜成本
          </button>
          <button
            onClick={() => setActiveTab('environment')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'environment'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            按环境统计
          </button>
        </div>

        <div className="p-4">
          {/* 设备折旧明细 */}
          {activeTab === 'overview' && (
            <div>
              {overview.serverCostDetails.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                  <p>暂无有采购价格的设备</p>
                  <p className="text-sm mt-1">请在服务器详情中填写采购价格</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-background-border">
                        <th className="text-left p-3 text-sm font-medium text-slate-400">设备名称</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-400">采购价</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-400">采购日期</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-400">已用时间</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-400">当前残值</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-400">已折旧</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-400">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.serverCostDetails.map((server) => {
                        const purchaseDate = server.purchaseDate ? new Date(server.purchaseDate) : null;
                        const now = new Date();
                        const yearsUsed = purchaseDate
                          ? ((now.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1)
                          : '0';
                        const progress = server.purchasePrice > 0
                          ? (server.depreciatedValue / server.purchasePrice) * 100
                          : 0;
                        const isFullyDepreciated = progress >= 100;

                        return (
                          <tr
                            key={server.id}
                            className="border-b border-background-border/50 hover:bg-background-border/30 cursor-pointer transition-colors"
                            onClick={() => navigate(`/servers/${server.id}`)}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Server className="w-4 h-4 text-slate-500" />
                                <span className="text-white font-medium">{server.name}</span>
                              </div>
                              <div className="text-xs text-slate-500">{server.cabinet || '未分配机柜'}</div>
                            </td>
                            <td className="p-3 text-white font-mono">{formatCurrency(server.purchasePrice)}</td>
                            <td className="p-3 text-slate-400 text-sm">
                              {server.purchaseDate ? new Date(server.purchaseDate).toLocaleDateString('zh-CN') : '-'}
                            </td>
                            <td className="p-3 text-slate-400 text-sm">{yearsUsed} 年</td>
                            <td className="p-3">
                              <span className={`font-semibold ${isFullyDepreciated ? 'text-slate-500' : 'text-green-400'}`}>
                                {formatCurrency(server.residualValue)}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-background rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${getProgressColor(progress)}`}
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-500">{progress.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className="p-3">
                              {isFullyDepreciated ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-500/20 text-slate-400 rounded text-xs">
                                  <CheckCircle className="w-3 h-3" />
                                  已折旧完毕
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                                  折旧中
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 机柜成本 */}
          {activeTab === 'cabinet' && (
            <div>
              {/* 环境筛选 */}
              <div className="flex items-center gap-4 mb-4">
                <label className="text-sm text-slate-400">按环境筛选:</label>
                <select
                  value={selectedEnv}
                  onChange={(e) => setSelectedEnv(e.target.value)}
                  className="bg-background border border-background-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value="">全部环境</option>
                  {environments.map(env => (
                    <option key={env} value={env}>{env}</option>
                  ))}
                </select>
              </div>

              {cabinetCosts.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                  <p>暂无机柜数据</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-background-border">
                        <th className="text-left p-3 text-sm font-medium text-slate-400">机柜</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-400">环境</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-400">设备数量</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-400">设备残值</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-400">年占用费</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-400">年度总成本</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cabinetCosts.map((cabinet, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-background-border/50 hover:bg-background-border/30 transition-colors"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-amber-500" />
                              <span className="text-white font-medium">{cabinet.cabinet}</span>
                            </div>
                          </td>
                          <td className="p-3 text-slate-400 text-sm">{cabinet.environment || '-'}</td>
                          <td className="p-3 text-white">{cabinet.serverCount} 台</td>
                          <td className="p-3 text-green-400 font-mono">{formatCurrency(cabinet.totalResidualValue)}</td>
                          <td className="p-3 text-purple-400 font-mono">{formatCurrency(cabinet.cabinetAnnualFee)}</td>
                          <td className="p-3 text-amber-400 font-mono font-semibold">
                            {formatCurrency(cabinet.totalAnnualCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-background-border/30">
                        <td className="p-3 text-white font-semibold" colSpan={2}>合计</td>
                        <td className="p-3 text-white font-semibold">
                          {cabinetCosts.reduce((sum, c) => sum + c.serverCount, 0)} 台
                        </td>
                        <td className="p-3 text-green-400 font-semibold font-mono">
                          {formatCurrency(cabinetCosts.reduce((sum, c) => sum + c.totalResidualValue, 0))}
                        </td>
                        <td className="p-3 text-purple-400 font-semibold font-mono">
                          {formatCurrency(cabinetCosts.reduce((sum, c) => sum + c.cabinetAnnualFee, 0))}
                        </td>
                        <td className="p-3 text-amber-400 font-semibold font-mono">
                          {formatCurrency(cabinetCosts.reduce((sum, c) => sum + c.totalAnnualCost, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 按环境统计 */}
          {activeTab === 'environment' && (
            <div>
              {envCosts.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                  <p>暂无环境数据</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {envCosts.map((env) => (
                    <div
                      key={env.environment}
                      className="bg-background border border-background-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">{env.environment}</h3>
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-400">设备数量</span>
                          <span className="text-white font-medium">{env.serverCount} 台</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-400">机柜数量</span>
                          <span className="text-white font-medium">{env.cabinetCount} 个</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-400">总采购价</span>
                          <span className="text-white font-mono">{formatCurrency(env.totalPurchasePrice)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-400">当前残值</span>
                          <span className="text-green-400 font-mono">{formatCurrency(env.totalResidualValue)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-400">已折旧</span>
                          <span className="text-amber-400 font-mono">{formatCurrency(env.totalDepreciatedValue)}</span>
                        </div>
                        <div className="border-t border-background-border pt-3 flex justify-between items-center">
                          <span className="text-sm text-slate-400">年机柜费</span>
                          <span className="text-purple-400 font-mono">{formatCurrency(env.cabinetAnnualFee)}</span>
                        </div>
                        <div className="border-t border-primary/30 pt-3 flex justify-between items-center">
                          <span className="text-sm text-white font-medium">年度总成本</span>
                          <span className="text-amber-400 font-bold">{formatCurrency(env.totalAnnualCost)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
