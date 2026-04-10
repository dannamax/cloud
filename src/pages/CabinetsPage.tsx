import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Server,
  Layers,
  Building2,
  Box,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { serverApi } from '../services/api';
import type { Server as ServerType } from '../types';

const CABINET_HEIGHT = 40; // 标准40U机柜

interface CabinetServer extends ServerType {
  uStart: number;
  uEnd: number;
}

interface CabinetInfo {
  name: string;
  environment: string;
  servers: CabinetServer[];
  totalU: number;
  usedU: number;
  freeU: number;
}

export function CabinetsPage() {
  const navigate = useNavigate();
  const [servers, setServers] = useState<ServerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);
  const [pingProgress, setPingProgress] = useState(0);
  const [filterEnvironment, setFilterEnvironment] = useState('');
  const [filterCabinet, setFilterCabinet] = useState('');
  const [cabinetInputType, setCabinetInputType] = useState<'input' | 'select'>('input');

  const fetchServers = async () => {
    setLoading(true);
    try {
      const data = await serverApi.getAll({});
      setServers(data);
    } catch (error) {
      console.error('获取服务器列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // SSH端口探测（根据当前选择的环境范围）
  const checkAllPorts = async () => {
    setPinging(true);
    setPingProgress(0);
    
    try {
      // 使用批量探测接口（传递当前选择的环境）
      const result = await serverApi.batchPortCheck(filterEnvironment || undefined);
      
      // 更新所有服务器状态
      if (result.results && result.results.length > 0) {
        const statusMap = new Map(result.results.map(r => [r.id, r.online]));
        setServers(prev => prev.map(s => {
          if (statusMap.has(s.id)) {
            return { ...s, online_status: statusMap.get(s.id) ? 'online' : 'offline' };
          }
          return s;
        }));
      }
      
      setPingProgress(100);
      
      // 显示探测结果
      if (result.total > 0) {
        console.log(`探测完成: 总计 ${result.total} 台, 在线 ${result.online} 台, 离线 ${result.offline} 台`);
      }
    } catch (error) {
      console.error('批量探测失败:', error);
    } finally {
      setPinging(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  // 按机柜分组
  const cabinets = useMemo(() => {
    const cabinetMap = new Map<string, CabinetInfo>();
    
    servers.forEach(server => {
      if (!server.cabinet) return;
      
      const cabinetName = server.cabinet.trim();
      if (!cabinetMap.has(cabinetName)) {
        cabinetMap.set(cabinetName, {
          name: cabinetName,
          environment: server.environment || '',
          servers: [],
          totalU: CABINET_HEIGHT,
          usedU: 0,
          freeU: CABINET_HEIGHT
        });
      }
      
      const cabinet = cabinetMap.get(cabinetName)!;
      const uStart = (server.u_position !== undefined && server.u_position !== null && server.u_position > 0) ? server.u_position : 1;
      const uHeight = server.u_height || 2;
      const uEnd = uStart + uHeight - 1;
      
      cabinet.servers.push({
        ...server,
        uStart,
        uEnd
      });
      cabinet.usedU += uHeight;
    });

    // 计算空闲U位
    cabinetMap.forEach(cabinet => {
      cabinet.freeU = cabinet.totalU - cabinet.usedU;
    });

    // 转换为数组并排序
    return Array.from(cabinetMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [servers]);

  // 筛选
  const filteredCabinets = useMemo(() => {
    return cabinets.filter(cabinet => {
      if (filterEnvironment && cabinet.environment !== filterEnvironment) return false;
      if (filterCabinet && !cabinet.name.includes(filterCabinet)) return false;
      return true;
    });
  }, [cabinets, filterEnvironment, filterCabinet]);

  // 获取所有环境列表
  const environments = useMemo(() => {
    const envs = new Set<string>();
    servers.forEach(s => s.environment && envs.add(s.environment));
    return Array.from(envs).sort();
  }, [servers]);

  // 根据选择的环境获取关联的机柜列表（用于下拉选择）
  const cabinetOptions = useMemo(() => {
    const cabinets = new Set<string>();
    servers.forEach(s => {
      if (s.cabinet && (!filterEnvironment || s.environment === filterEnvironment)) {
        cabinets.add(s.cabinet.trim());
      }
    });
    return Array.from(cabinets).sort();
  }, [servers, filterEnvironment]);

  // 环境变化时切换机柜输入类型
  useEffect(() => {
    if (filterEnvironment) {
      setCabinetInputType('select');
      setFilterCabinet(''); // 清空机柜选择
    } else {
      setCabinetInputType('input');
      setFilterCabinet('');
    }
  }, [filterEnvironment]);

  // 统计信息
  const stats = useMemo(() => {
    const totalCabinets = cabinets.length;
    const totalServers = servers.length;
    const totalUsedU = cabinets.reduce((sum, c) => sum + c.usedU, 0);
    const totalFreeU = cabinets.reduce((sum, c) => sum + c.freeU, 0);
    const totalU = totalCabinets * CABINET_HEIGHT;
    return { totalCabinets, totalServers, totalUsedU, totalFreeU, totalU };
  }, [cabinets, servers]);

  // 渲染单个机柜
  const renderCabinet = (cabinet: CabinetInfo) => {
    // 按IP地址排序服务器
    const sortedServers = [...cabinet.servers].sort((a, b) => 
      (a.system_ip || '').localeCompare(b.system_ip || '')
    );

    // 获取在线状态图标和颜色
    const getStatusDisplay = (status: string) => {
      switch (status) {
        case 'online':
          return { icon: '🟢', text: '在线', className: 'text-green-400' };
        case 'offline':
          return { icon: '🔴', text: '离线', className: 'text-red-400' };
        default:
          return { icon: '🟡', text: '未知', className: 'text-yellow-400' };
      }
    };

    return (
      <div key={cabinet.name} className="bg-background-card border border-background-border rounded-xl overflow-hidden flex-shrink-0 w-[320px]">
        {/* 机柜头部 */}
        <div className="bg-background-border px-3 py-2 border-b border-background-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span className="font-medium text-white text-sm">{cabinet.name}</span>
            </div>
            <span className="text-xs text-slate-400">{cabinet.environment || '-'}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="text-green-400">已用: {cabinet.usedU}U</span>
            <span className="text-slate-400">空闲: {cabinet.freeU}U</span>
            <span className="text-slate-400">服务器: {cabinet.servers.length}台</span>
          </div>
        </div>

        {/* 服务器列表视图 */}
        <div className="p-2">
          <div className="bg-slate-900 rounded-lg p-2">
            {sortedServers.length === 0 ? (
              <div className="text-center text-slate-500 py-4 text-sm">暂无服务器</div>
            ) : (
              <div className="space-y-1">
                {sortedServers.map(server => {
                  const statusDisplay = getStatusDisplay(server.online_status || '');
                  return (
                    <div
                      key={server.id}
                      onClick={() => navigate(`/servers/${server.id}`)}
                      className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-800/50 hover:bg-slate-700/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-white">{server.system_ip}</span>
                        <span className="text-xs text-slate-500">U{server.uStart}-{server.uEnd}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{statusDisplay.icon}</span>
                        <span className={`text-xs ${statusDisplay.className}`}>{statusDisplay.text}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-background-card border border-background-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">机柜数量</p>
              <p className="text-2xl font-bold text-white">{stats.totalCabinets}</p>
            </div>
          </div>
        </div>
        <div className="bg-background-card border border-background-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-slate-400">服务器总数</p>
              <p className="text-2xl font-bold text-white">{stats.totalServers}</p>
            </div>
          </div>
        </div>
        <div className="bg-background-card border border-background-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Box className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">已用U位</p>
              <p className="text-2xl font-bold text-green-400">{stats.totalUsedU}U</p>
            </div>
          </div>
        </div>
        <div className="bg-background-card border border-background-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-500/20 flex items-center justify-center">
              <Box className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">空闲U位</p>
              <p className="text-2xl font-bold text-slate-300">{stats.totalFreeU}U</p>
            </div>
          </div>
        </div>
        <div className="bg-background-card border border-background-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">U位利用率</p>
              <p className="text-2xl font-bold text-purple-400">
                {stats.totalU > 0 ? Math.round(stats.totalUsedU / stats.totalU * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-400">环境:</span>
          <select
            value={filterEnvironment}
            onChange={(e) => setFilterEnvironment(e.target.value)}
            className="bg-background-card border border-background-border rounded-lg px-3 py-1.5 text-sm text-white"
          >
            <option value="">全部</option>
            {environments.map(env => (
              <option key={env} value={env}>{env}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-400">机柜:</span>
          {cabinetInputType === 'select' ? (
            <select
              value={filterCabinet}
              onChange={(e) => setFilterCabinet(e.target.value)}
              className="bg-background-card border border-background-border rounded-lg px-3 py-1.5 text-sm text-white w-40"
            >
              <option value="">全部</option>
              {cabinetOptions.map(cab => (
                <option key={cab} value={cab}>{cab}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="搜索机柜..."
              value={filterCabinet}
              onChange={(e) => setFilterCabinet(e.target.value)}
              className="bg-background-card border border-background-border rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-slate-500 w-40"
            />
          )}
        </div>
        <button
          onClick={fetchServers}
          className="flex items-center gap-2 px-4 py-1.5 bg-background-card border border-background-border rounded-lg text-slate-300 hover:text-white hover:border-primary/50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
        <button
          onClick={checkAllPorts}
          disabled={pinging}
          className="flex items-center gap-2 px-4 py-1.5 bg-background-card border border-background-border rounded-lg text-slate-300 hover:text-white hover:border-primary/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={pinging ? 'animate-spin' : ''} />
          {pinging ? `探测中 ${pingProgress}%` : '端口探测'}
        </button>
      </div>

      {/* 机柜列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filteredCabinets.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>暂无机柜数据</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {filteredCabinets.map(renderCabinet)}
        </div>
      )}

      {/* 图例 */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <span className="text-slate-500">图例:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-green-600/80"></div>
          <span>在线</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-red-600/80"></div>
          <span>离线</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-yellow-600/80"></div>
          <span>未知</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-slate-600"></div>
          <span>待上架</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-slate-800 border border-slate-700"></div>
          <span>空闲</span>
        </div>
      </div>
    </div>
  );
}
