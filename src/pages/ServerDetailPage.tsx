import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  RefreshCw,
  Activity,
  Wifi,
  History,
  Save,
  X,
  Cpu,
  Settings,
  FileText
} from 'lucide-react';
import { serverApi, changeLogApi } from '../services/api';
import type { Server, ChangeLog } from '../types';

const statusColors: Record<string, string> = {
  '已上架': 'bg-status-online/20 text-status-online',
  '待上架': 'bg-slate-500/20 text-slate-400',
  '异动中': 'bg-status-warning/20 text-status-warning',
  '异动回': 'bg-purple-500/20 text-purple-400',
};

const onlineStatusColors: Record<string, string> = {
  'online': 'text-status-online',
  'offline': 'text-status-offline',
  'unknown': 'text-slate-400',
};

type InfoTab = 'basic' | 'hardware' | 'network' | 'operation';

const tabConfig = [
  { key: 'basic' as InfoTab, label: '基础信息', icon: Settings },
  { key: 'hardware' as InfoTab, label: '硬件信息', icon: Cpu },
  { key: 'network' as InfoTab, label: '网络信息', icon: Wifi },
  { key: 'operation' as InfoTab, label: '运营信息', icon: Activity },
];

export function ServerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [server, setServer] = useState<Server | null>(null);
  const [editData, setEditData] = useState<Server | null>(null);
  const [editing, setEditing] = useState(false);
  const [changeLogs, setChangeLogs] = useState<ChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<InfoTab>('basic');
  const [changeForm, setChangeForm] = useState({
    change_type: '',
    after_status: '',
    remark: '',
  });

  const fetchData = async () => {
    if (!id || id === 'new') {
      setLoading(false);
      return;
    }
    try {
      const [serverData, logsData] = await Promise.all([
        serverApi.getById(Number(id)),
        changeLogApi.getByServer(Number(id)),
      ]);
      setServer(serverData);
      setChangeLogs(logsData);
    } catch (error) {
      console.error('获取服务器失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!server) return;
    try {
      if (id === 'new') {
        await serverApi.create(server);
      } else {
        await serverApi.update(Number(id), server);
      }
      navigate('/servers');
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  const handleEditSave = async () => {
    if (!editData || !id || id === 'new') return;
    setSaving(true);
    try {
      await serverApi.update(Number(id), editData);
      setServer(editData);
      setEditing(false);
      fetchData();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleEditCancel = () => {
    setEditData(null);
    setEditing(false);
  };

  const handleEdit = () => {
    setEditData({ ...server } as Server);
    setEditing(true);
  };

  const handleDelete = async () => {
    if (!id || id === 'new') return;
    if (!confirm('确定要删除这台服务器吗？')) return;
    try {
      await serverApi.delete(Number(id));
      navigate('/servers');
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleChangeStatus = async () => {
    if (!id || id === 'new') return;
    try {
      await serverApi.changeStatus(Number(id), {
        change_type: changeForm.change_type,
        after_status: changeForm.after_status,
        operator: 'admin',
        remark: changeForm.remark,
      });
      setShowChangeModal(false);
      setChangeForm({ change_type: '', after_status: '', remark: '' });
      fetchData();
    } catch (error) {
      console.error('状态变更失败:', error);
    }
  };

  const updateField = (field: string, value: any) => {
    if (editData) {
      setEditData({ ...editData, [field]: value });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (id === 'new') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/servers')} className="text-slate-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold text-white">新增服务器</h1>
        </div>

        <div className="bg-background-card border border-background-border rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">主机名</label>
              <input
                type="text"
                value={server?.name || ''}
                onChange={e => setServer(s => s ? { ...s, name: e.target.value } : { name: e.target.value } as Server)}
                className="w-full bg-background border border-background-border rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">环境</label>
              <input
                type="text"
                value={server?.environment || ''}
                onChange={e => setServer(s => s ? { ...s, environment: e.target.value } : { environment: e.target.value } as Server)}
                className="w-full bg-background border border-background-border rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">系统IP</label>
              <input
                type="text"
                value={server?.system_ip || ''}
                onChange={e => setServer(s => s ? { ...s, system_ip: e.target.value } : { system_ip: e.target.value } as Server)}
                className="w-full bg-background border border-background-border rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">机柜</label>
              <input
                type="text"
                value={server?.cabinet || ''}
                onChange={e => setServer(s => s ? { ...s, cabinet: e.target.value } : { cabinet: e.target.value } as Server)}
                className="w-full bg-background border border-background-border rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">角色</label>
              <input
                type="text"
                value={server?.role || ''}
                onChange={e => setServer(s => s ? { ...s, role: e.target.value } : { role: e.target.value } as Server)}
                className="w-full bg-background border border-background-border rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">状态</label>
              <select
                value={server?.status || '待上架'}
                onChange={e => setServer(s => s ? { ...s, status: e.target.value as any } : { status: e.target.value as any } as Server)}
                className="w-full bg-background border border-background-border rounded-lg px-4 py-2 text-white"
              >
                <option value="待上架">待上架</option>
                <option value="已上架">已上架</option>
                <option value="异动中">异动中</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-4">
            <button onClick={() => navigate('/servers')} className="px-4 py-2 text-slate-400">取消</button>
            <button onClick={handleSave} className="px-6 py-2 bg-primary rounded-lg text-white">保存</button>
          </div>
        </div>
      </div>
    );
  }

  if (!server) {
    return <div className="text-center text-slate-400">服务器不存在</div>;
  }

  const currentData = editing ? editData : server;

  const renderInfoTable = (fields: { label: string; key: string; type?: 'select' }[]) => (
    <table className="w-full">
      <tbody>
        {fields.map((field, index) => (
          <tr key={field.key} className={index < fields.length - 1 ? 'border-b border-background-border' : ''}>
            <td className="py-3 pr-4 text-slate-400 whitespace-nowrap w-1/4">{field.label}</td>
            <td className="py-3 text-white">
              {editing ? (
                field.type === 'select' ? (
                  <select
                    value={(currentData as any)[field.key] || ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    className="w-full bg-background border border-background-border rounded px-3 py-1.5 text-white"
                  >
                    {field.key === 'status' && (
                      <>
                        <option value="待上架">待上架</option>
                        <option value="已上架">已上架</option>
                        <option value="异动中">异动中</option>
                        <option value="异动回">异动回</option>
                      </>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={(currentData as any)[field.key] || ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    className="w-full bg-background border border-background-border rounded px-3 py-1.5 text-white"
                  />
                )
              ) : (
                (currentData as any)[field.key] || '-'
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/servers')} className="text-slate-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold text-white">{server.name || '服务器详情'}</h1>
          {!editing && (
            <span className={`text-xs px-2 py-1 rounded ${statusColors[server.status] || 'bg-slate-500/20 text-slate-400'}`}>
              {server.status}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          {editing ? (
            <>
              <button
                onClick={handleEditCancel}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
              >
                <X size={16} />
                取消
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? '保存中...' : '保存'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30"
              >
                <Edit size={16} />
                编辑
              </button>
              <button
                onClick={() => setShowChangeModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-status-warning/20 text-status-warning rounded-lg hover:bg-status-warning/30"
              >
                <Activity size={16} />
                标记异动
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-status-offline/20 text-status-offline rounded-lg hover:bg-status-offline/30"
              >
                <Trash2 size={16} />
                删除
              </button>
            </>
          )}
        </div>
      </div>

      {/* 主要内容区 - 左右布局 */}
      <div className="bg-background-card border border-background-border rounded-xl overflow-hidden">
        <div className="flex">
          {/* 左侧导航 */}
          <div className="w-40 bg-background-border/50 border-r border-background-border p-4">
            <nav className="space-y-1">
              {tabConfig.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeTab === tab.key
                        ? 'bg-primary text-white'
                        : 'text-slate-400 hover:text-white hover:bg-background-border'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
            
            {/* 状态概览 */}
            <div className="mt-6 pt-4 border-t border-background-border">
              <div className="text-xs text-slate-500 mb-2">状态概览</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">在线状态</span>
                  <span className={`text-xs font-medium ${onlineStatusColors[server.online_status]}`}>
                    {server.online_status === 'online' ? '在线' : server.online_status === 'offline' ? '离线' : '未知'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">上架状态</span>
                  <span className={`text-xs font-medium ${
                    server.status === '已上架' ? 'text-status-online' :
                    server.status === '异动中' ? 'text-status-warning' : 'text-slate-400'
                  }`}>
                    {server.status}
                  </span>
                </div>
                {server.last_heartbeat && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">最后心跳</span>
                    <span className="text-xs text-slate-400">
                      {new Date(server.last_heartbeat).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧详情内容 */}
          <div className="flex-1 p-6">
            {/* 基础信息 */}
            {activeTab === 'basic' && (
              <div>
                <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
                  <Settings size={18} className="text-primary" />
                  基础信息
                </h3>
                <div className="bg-background rounded-lg p-4">
                  {renderInfoTable([
                    { label: '主机名', key: 'name' },
                    { label: 'SN号', key: 'sn' },
                    { label: '品牌', key: 'brand' },
                    { label: '型号', key: 'model' },
                    { label: '环境', key: 'environment' },
                    { label: '角色', key: 'role' },
                    { label: '标签', key: 'tags' },
                  ])}
                </div>
              </div>
            )}

            {/* 硬件信息 */}
            {activeTab === 'hardware' && (
              <div>
                <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
                  <Cpu size={18} className="text-primary" />
                  硬件配置
                </h3>
                <div className="bg-background rounded-lg p-4">
                  {renderInfoTable([
                    { label: 'CPU', key: 'cpu' },
                    { label: '内存', key: 'memory' },
                    { label: '磁盘', key: 'disk' },
                    { label: '网卡', key: 'network_card' },
                    { label: '机柜', key: 'cabinet' },
                    { label: 'U位', key: 'u_position' },
                    { label: 'U高', key: 'u_height' },
                  ])}
                </div>
              </div>
            )}

            {/* 网络信息 */}
            {activeTab === 'network' && (
              <div>
                <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
                  <Wifi size={18} className="text-primary" />
                  网络配置
                </h3>
                <div className="bg-background rounded-lg p-4">
                  {renderInfoTable([
                    { label: '系统IP', key: 'system_ip' },
                    { label: '管理IP', key: 'manage_ip' },
                    { label: '带外IP', key: 'oob_ip' },
                    { label: 'MAC地址', key: 'mac_address' },
                  ])}
                </div>
              </div>
            )}

            {/* 运营信息 */}
            {activeTab === 'operation' && (
              <div>
                <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
                  <Activity size={18} className="text-primary" />
                  运营信息
                </h3>
                <div className="bg-background rounded-lg p-4">
                  {renderInfoTable([
                    { label: '状态', key: 'status', type: 'select' },
                    { label: '在线状态', key: 'online_status' },
                    { label: '最后心跳', key: 'last_heartbeat' },
                  ])}
                </div>
                
                {/* 备注信息 */}
                <h3 className="text-base font-medium text-white mt-6 mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-primary" />
                  备注信息
                </h3>
                <div className="bg-background rounded-lg p-4">
                  {editing ? (
                    <textarea
                      value={editData?.remark || ''}
                      onChange={(e) => updateField('remark', e.target.value)}
                      className="w-full bg-background border border-background-border rounded px-3 py-2 text-white whitespace-pre-wrap"
                      rows={4}
                      placeholder="请输入备注信息"
                    />
                  ) : (
                    <p className="text-slate-400 whitespace-pre-wrap">{server.remark || '暂无备注'}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 变更历史 */}
      <div className="bg-background-card border border-background-border rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <History size={18} className="text-primary" />
          变更历史
        </h2>
        {changeLogs.length > 0 ? (
          <div className="space-y-4">
            {changeLogs.map((log) => (
              <div key={log.id} className="flex gap-4 pb-4 border-b border-background-border last:border-0">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{log.change_type}</span>
                    <span className="text-slate-500">{log.before_status} → {log.after_status}</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{log.remark}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span>{log.operator}</span>
                    <span>{new Date(log.created_at).toLocaleString('zh-CN')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">暂无变更记录</p>
        )}
      </div>

      {/* 异动弹窗 */}
      {showChangeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-card border border-background-border rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">标记异动</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">异动类型</label>
                <select
                  value={changeForm.change_type}
                  onChange={e => setChangeForm(f => ({ ...f, change_type: e.target.value }))}
                  className="w-full bg-background border border-background-border rounded-lg px-4 py-2 text-white"
                >
                  <option value="">请选择</option>
                  <option value="上架">上架</option>
                  <option value="下架">下架</option>
                  <option value="迁移">迁移</option>
                  <option value="故障">故障</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">目标状态</label>
                <select
                  value={changeForm.after_status}
                  onChange={e => setChangeForm(f => ({ ...f, after_status: e.target.value }))}
                  className="w-full bg-background border border-background-border rounded-lg px-4 py-2 text-white"
                >
                  <option value="">请选择</option>
                  <option value="已上架">已上架</option>
                  <option value="待上架">待上架</option>
                  <option value="异动中">异动中</option>
                  <option value="异动回">异动回</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">备注</label>
                <textarea
                  value={changeForm.remark}
                  onChange={e => setChangeForm(f => ({ ...f, remark: e.target.value }))}
                  className="w-full bg-background border border-background-border rounded-lg px-4 py-2 text-white h-24"
                  placeholder="请输入备注信息"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button onClick={() => setShowChangeModal(false)} className="px-4 py-2 text-slate-400">取消</button>
              <button onClick={handleChangeStatus} className="px-6 py-2 bg-primary rounded-lg text-white">确认</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
