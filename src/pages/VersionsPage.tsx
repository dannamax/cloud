import { useState, useEffect } from 'react';
import { versionApi } from '../services/api';
import { useAppStore } from '../stores/appStore';
import {
  Plus,
  RotateCcw,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Database,
  Layers,
  GitBranch,
  Eye,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';

interface Version {
  id: number;
  version_number: number;
  data_type: string;
  snapshot_data: string;
  description: string;
  operator: string;
  created_at: string;
}

export function VersionsPage() {
  const { user } = useAppStore();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [latestVersion, setLatestVersion] = useState(0);

  // 筛选
  const [dataType, setDataType] = useState('');

  // 快照弹窗
  const [snapshotModal, setSnapshotModal] = useState(false);
  const [snapshotType, setSnapshotType] = useState('all');
  const [snapshotDesc, setSnapshotDesc] = useState('');

  // 详情弹窗
  const [detailModal, setDetailModal] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  // 回退弹窗
  const [rollbackModal, setRollbackModal] = useState(false);
  const [rollbackVersion, setRollbackVersion] = useState<Version | null>(null);
  const [rollbackConfirm, setRollbackConfirm] = useState('');

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const [versionsRes, latestRes] = await Promise.all([
        versionApi.getAll({ data_type: dataType || undefined, limit: pageSize, offset: (page - 1) * pageSize }),
        versionApi.getLatest(),
      ]);
      setVersions(versionsRes.data);
      setTotal(versionsRes.total);
      setLatestVersion(latestRes.latestVersion);
    } catch (error) {
      console.error('加载版本列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, dataType]);

  // 创建快照
  const handleCreateSnapshot = async () => {
    try {
      await versionApi.createSnapshot({
        data_type: snapshotType,
        description: snapshotDesc,
        operator: user?.display_name || user?.username,
      });
      setSnapshotModal(false);
      setSnapshotDesc('');
      setSnapshotType('all');
      loadData();
    } catch (error) {
      console.error('创建快照失败:', error);
    }
  };

  // 查看详情
  const handleViewDetail = async (version: Version) => {
    try {
      const res = await versionApi.getById(version.version_number);
      setSelectedVersion(res.data);
      setDetailModal(true);
    } catch (error) {
      console.error('获取版本详情失败:', error);
    }
  };

  // 回退版本
  const handleRollback = async () => {
    if (!rollbackVersion) return;
    try {
      await versionApi.rollback(rollbackVersion.version_number, user?.display_name || user?.username);
      setRollbackModal(false);
      setRollbackVersion(null);
      setRollbackConfirm('');
      loadData();
      alert(`成功回退到版本 v${rollbackVersion.version_number}`);
    } catch (error) {
      console.error('回退版本失败:', error);
      alert('回退失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const getDataTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      all: '全量',
      servers: '服务器',
      cabinets: '机柜',
      environments: '环境',
      tags: '标签',
    };
    return labels[type] || type;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">版本管理</h1>
            <p className="text-sm text-slate-400 mt-0.5">数据快照与版本回退</p>
          </div>
        </div>
        <button
          onClick={() => setSnapshotModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          创建快照
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-background-card rounded-lg p-4 border border-background-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">{total}</p>
              <p className="text-sm text-slate-400">总版本数</p>
            </div>
          </div>
        </div>
        <div className="bg-background-card rounded-lg p-4 border border-background-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">v{latestVersion}</p>
              <p className="text-sm text-slate-400">最新版本</p>
            </div>
          </div>
        </div>
        <div className="bg-background-card rounded-lg p-4 border border-background-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">全量/单项</p>
              <p className="text-sm text-slate-400">数据类型</p>
            </div>
          </div>
        </div>
        <div className="bg-background-card rounded-lg p-4 border border-background-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">一键恢复</p>
              <p className="text-sm text-slate-400">支持回退</p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-background-card rounded-lg border border-background-border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-400" />
            <select
              value={dataType}
              onChange={(e) => { setDataType(e.target.value); setPage(1); }}
              className="bg-background border border-background-border rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="" className="bg-background">全部类型</option>
              <option value="all" className="bg-background">全量</option>
              <option value="servers" className="bg-background">服务器</option>
              <option value="cabinets" className="bg-background">机柜</option>
              <option value="environments" className="bg-background">环境</option>
              <option value="tags" className="bg-background">标签</option>
            </select>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-background-border rounded-md transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {/* 版本列表 */}
      <div className="bg-background-card rounded-lg border border-background-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-background border-b border-background-border">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">版本号</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">数据类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">描述</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">操作人</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">创建时间</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-background-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto" />
                </td>
              </tr>
            ) : versions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  暂无版本记录，请先创建快照
                </td>
              </tr>
            ) : (
              versions.map((version) => (
                <tr key={version.id} className="hover:bg-background-border/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-indigo-400" />
                      <span className="font-mono font-medium text-indigo-400">v{version.version_number}</span>
                      {version.version_number === latestVersion && (
                        <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full border border-green-500/30">最新</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-md border border-blue-500/30">
                      {getDataTypeLabel(version.data_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300 max-w-xs truncate">
                    {version.description || '无描述'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <User className="w-4 h-4 text-slate-500" />
                      {version.operator}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-4 h-4 text-slate-600" />
                      {formatDate(version.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleViewDetail(version)}
                        className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {version.version_number < latestVersion && (
                        <button
                          onClick={() => { setRollbackVersion(version); setRollbackModal(true); }}
                          className="p-2 text-slate-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-md transition-colors"
                          title="回退到此版本"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-background-border">
            <p className="text-sm text-slate-400">
              共 {total} 条记录，第 {page}/{totalPages} 页
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-md border border-background-border text-slate-400 disabled:opacity-30 hover:bg-background-border hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-md border border-background-border text-slate-400 disabled:opacity-30 hover:bg-background-border hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 创建快照弹窗 */}
      {snapshotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background-card rounded-lg w-full max-w-md border border-background-border shadow-xl">
            <div className="p-4 border-b border-background-border flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                创建数据快照
              </h3>
              <button onClick={() => setSnapshotModal(false)} className="p-1 text-slate-400 hover:text-white hover:bg-background-border rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">数据类型</label>
                <select
                  value={snapshotType}
                  onChange={(e) => setSnapshotType(e.target.value)}
                  className="w-full bg-background border border-background-border rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all" className="bg-background">全量数据（所有表）</option>
                  <option value="servers" className="bg-background">仅服务器</option>
                  <option value="cabinets" className="bg-background">仅机柜</option>
                  <option value="environments" className="bg-background">仅环境</option>
                  <option value="tags" className="bg-background">仅标签</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">描述</label>
                <input
                  type="text"
                  value={snapshotDesc}
                  onChange={(e) => setSnapshotDesc(e.target.value)}
                  placeholder="可选，描述此快照的用途..."
                  className="w-full bg-background border border-background-border rounded-md px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-background-border">
              <button
                onClick={() => setSnapshotModal(false)}
                className="px-4 py-2 border border-background-border rounded-md text-slate-400 hover:text-white hover:bg-background-border transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateSnapshot}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-colors"
              >
                创建快照
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {detailModal && selectedVersion && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background-card rounded-lg w-full max-w-2xl max-h-[80vh] border border-background-border shadow-xl overflow-hidden">
            <div className="p-4 border-b border-background-border flex justify-between items-center">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-indigo-400" />
                版本 v{selectedVersion.version_number} 详情
              </h3>
              <button onClick={() => setDetailModal(false)} className="p-1 text-slate-400 hover:text-white hover:bg-background-border rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-slate-400">数据类型</p>
                  <p className="font-medium text-white">{getDataTypeLabel(selectedVersion.data_type)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">操作人</p>
                  <p className="font-medium text-white">{selectedVersion.operator}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-400">描述</p>
                  <p className="font-medium text-white">{selectedVersion.description || '无'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-400">创建时间</p>
                  <p className="font-medium text-white">{formatDate(selectedVersion.created_at)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-2">快照数据预览</p>
                <pre className="bg-background rounded-lg p-4 text-xs text-slate-400 overflow-auto max-h-64 border border-background-border">
                  {JSON.stringify(JSON.parse(selectedVersion.snapshot_data), null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 回退确认弹窗 */}
      {rollbackModal && rollbackVersion && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background-card rounded-lg w-full max-w-md border border-background-border shadow-xl">
            <div className="p-4 border-b border-background-border">
              <h3 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                确认回退版本
              </h3>
            </div>
            <div className="p-6">
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
                <p className="text-sm text-orange-300">
                  警告：回退操作将会：
                </p>
                <ul className="text-sm text-orange-200 mt-2 space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400">•</span>
                    用版本 v{rollbackVersion.version_number} 的数据覆盖当前数据
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400">•</span>
                    回退前会自动创建当前数据的快照备份
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400">•</span>
                    此操作不可撤销
                  </li>
                </ul>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  输入 <span className="font-mono text-red-400">回退</span> 确认操作
                </label>
                <input
                  type="text"
                  value={rollbackConfirm}
                  onChange={(e) => setRollbackConfirm(e.target.value)}
                  placeholder="回退"
                  className="w-full bg-background border border-background-border rounded-md px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-background-border">
              <button
                onClick={() => { setRollbackModal(false); setRollbackConfirm(''); }}
                className="px-4 py-2 border border-background-border rounded-md text-slate-400 hover:text-white hover:bg-background-border transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleRollback}
                disabled={rollbackConfirm !== '回退'}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认回退
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
