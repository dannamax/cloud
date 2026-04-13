import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  Building2,
  Layers,
  X,
  Check,
  Download,
  Square,
  CheckSquare,
  AlertTriangle,
  Columns
} from 'lucide-react';
import { cabinetApi, environmentApi, serverApi, customColumnApi, settingsApi, CustomColumn } from '../services/api';
import type { Cabinet, Environment, Server } from '../types';

// 基础字段定义（系统字段）
const BASE_FIELDS = [
  { key: 'name', label: '环境名称', editable: false },
  { key: 'code', label: '编码', editable: true },
  { key: 'description', label: '描述', editable: true },
  { key: 'server_count', label: '服务器数', editable: false },
  { key: 'sort_order', label: '排序', editable: true },
  { key: 'status', label: '状态', editable: true },
];

export function ConfigPage() {
  const [activeTab, setActiveTab] = useState<'environments' | 'cabinets'>('environments');
  const [loading, setLoading] = useState(false);
  
  // 基础字段显示名称（用户可自定义）
  const [baseFieldLabels, setBaseFieldLabels] = useState<Record<string, string>>({});

  // 机柜状态
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [cabinetFilter, setCabinetFilter] = useState({ environment: '', keyword: '' });
  const [cabinetModal, setCabinetModal] = useState<{ open: boolean; data?: Cabinet }>({ open: false });
  const [cabinetForm, setCabinetForm] = useState({ name: '', environment: '', total_u: 42, reserved_u: '', remark: '' });

  // 环境状态
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [envFilter, setEnvFilter] = useState({ status: '', keyword: '' });
  const [envModal, setEnvModal] = useState<{ open: boolean; data?: Environment }>({ open: false });
  const [envForm, setEnvForm] = useState<{ name: string; code: string; description: string; sort_order: number; status: 'active' | 'disabled' }>({ name: '', code: '', description: '', sort_order: 0, status: 'active' });
  const [selectedEnvs, setSelectedEnvs] = useState<number[]>([]);
  const [batchDeleteModal, setBatchDeleteModal] = useState(false);
  const [batchEditModal, setBatchEditModal] = useState(false);
  const [batchEditData, setBatchEditData] = useState({ status: '' });

  // 自定义列状态
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [columnConfigModal, setColumnConfigModal] = useState(false);
  const [columnModal, setColumnModal] = useState<{ open: boolean; data?: CustomColumn }>({ open: false });
  const [columnForm, setColumnForm] = useState({
    column_key: '',
    column_label: '',
    column_type: 'text',
    options: '',
    sort_order: 0,
    visible: true,
    width: 100,
    editable: true,
    required: false
  });
  // 内联编辑状态
  const [inlineEditId, setInlineEditId] = useState<number | string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');

  // 基础字段编辑状态
  const [editingCell, setEditingCell] = useState<{ envId: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // 获取环境列表（用于机柜选择）
  const [envList, setEnvList] = useState<string[]>([]);
  
  // 服务器数据（用于计算环境服务器数量）
  const [servers, setServers] = useState<Server[]>([]);
  
  // 计算每个环境的服务器数量
  const envServerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    servers.forEach(server => {
      if (server.environment) {
        counts[server.environment] = (counts[server.environment] || 0) + 1;
      }
    });
    return counts;
  }, [servers]);
  
  // 计算自定义列的自动宽度（根据内容长度）
  const columnWidths = useMemo(() => {
    const widths: Record<string, number> = {};
    customColumns.filter(c => c.visible).forEach(col => {
      // 取列标题和所有数据中最长的内容，加上 padding
      let maxLen = col.column_label.length;
      environments.forEach(env => {
        const value = env.customFields?.[col.column_key] || '';
        if (value.length > maxLen) maxLen = value.length;
      });
      // 每个字符约 8px 宽度，最小 60px
      widths[col.column_key] = Math.max(maxLen * 8 + 24, 60);
    });
    return widths;
  }, [customColumns, environments]);
  
  // 同步状态
  const [syncing, setSyncing] = useState<'cabinet' | 'environment' | null>(null);

  // 加载自定义列配置
  const loadCustomColumns = async () => {
    try {
      const data = await customColumnApi.getAll('environments');
      setCustomColumns(data);
    } catch (error) {
      console.error('加载自定义列失败:', error);
    }
  };

  // 加载基础字段标签配置
  const loadBaseFieldLabels = async () => {
    try {
      const setting = await axios.get(`${import.meta.env.VITE_API_BASE || '/api'}/settings/env_base_field_labels`).catch(() => null);
      if (setting?.data?.value) {
        const labels = JSON.parse(setting.data.value);
        setBaseFieldLabels(labels);
      }
    } catch (error) {
      console.error('加载字段标签配置失败:', error);
    }
  };

  // 保存基础字段标签配置
  const saveBaseFieldLabels = async (labels: Record<string, string>) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE || '/api'}/settings/env_base_field_labels`, {
        value: JSON.stringify(labels)
      });
      setBaseFieldLabels(labels);
    } catch (error) {
      console.error('保存字段标签配置失败:', error);
      throw error;
    }
  };

  // 获取字段显示名称
  const getFieldLabel = (fieldKey: string, defaultLabel: string) => {
    return baseFieldLabels[fieldKey] || defaultLabel;
  };

  // 同步处理函数
  const handleSyncCabinets = async () => {
    setSyncing('cabinet');
    try {
      const result = await cabinetApi.syncWithServers();
      alert(result.message);
      loadCabinets();
    } catch (error: any) {
      alert(error.response?.data?.error || '同步失败');
    } finally {
      setSyncing(null);
    }
  };
  
  const handleSyncEnvironments = async () => {
    setSyncing('environment');
    try {
      const result = await environmentApi.sync();
      alert(result.message);
      loadEnvironments();
    } catch (error: any) {
      alert(error.response?.data?.error || '同步失败');
    } finally {
      setSyncing(null);
    }
  };

  // 加载数据
  const loadCabinets = async () => {
    setLoading(true);
    try {
      const data = await cabinetApi.getAll(cabinetFilter);
      setCabinets(data);
    } catch (error) {
      console.error('加载机柜失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEnvironments = async () => {
    setLoading(true);
    try {
      const [envData, serversData] = await Promise.all([
        environmentApi.getAll(envFilter),
        serverApi.getAll({})
      ]);
      setEnvironments(envData);
      setServers(serversData);
      // 提取环境名称列表
      setEnvList(envData.filter(e => e.status === 'active').map(e => e.name));
    } catch (error) {
      console.error('加载环境失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cabinets') {
      loadCabinets();
    } else {
      loadEnvironments();
      loadCustomColumns();
      loadBaseFieldLabels();
    }
  }, [activeTab, cabinetFilter, envFilter]);

  // 机柜操作
  const handleCabinetSave = async () => {
    try {
      if (cabinetModal.data?.id) {
        await cabinetApi.update(cabinetModal.data.id, cabinetForm);
      } else {
        await cabinetApi.create(cabinetForm);
      }
      setCabinetModal({ open: false });
      setCabinetForm({ name: '', environment: '', total_u: 42, reserved_u: '', remark: '' });
      loadCabinets();
    } catch (error: any) {
      alert(error.response?.data?.error || '操作失败');
    }
  };

  const handleCabinetDelete = async (id: number) => {
    if (!confirm('确定要删除该机柜吗？')) return;
    try {
      await cabinetApi.delete(id);
      loadCabinets();
    } catch (error: any) {
      alert(error.response?.data?.error || '删除失败');
    }
  };

  // 环境操作
  const handleEnvSave = async () => {
    try {
      const data: any = { ...envForm };
      // 如果有自定义字段值，添加到请求数据中
      const modalData = envModal.data as any;
      if (modalData?.customFields) {
        data.customFields = modalData.customFields;
      }
      if (envModal.data?.id) {
        await environmentApi.update(envModal.data.id, data);
      } else {
        await environmentApi.create(data);
      }
      setEnvModal({ open: false });
      setEnvForm({ name: '', code: '', description: '', sort_order: 0, status: 'active' });
      loadEnvironments();
    } catch (error: any) {
      alert(error.response?.data?.error || '操作失败');
    }
  };

  // 自定义列操作
  const handleColumnSave = async () => {
    try {
      const data = {
        page_type: 'environments',
        column_key: columnForm.column_key,
        column_label: columnForm.column_label,
        column_type: columnForm.column_type,
        options: columnForm.options.split(',').map(s => s.trim()).filter(Boolean),
        sort_order: columnForm.sort_order,
        visible: columnForm.visible,
        width: columnForm.width,
        editable: columnForm.editable,
        required: columnForm.required
      };

      if (columnModal.data?.id) {
        await customColumnApi.update(columnModal.data.id, data);
      } else {
        await customColumnApi.create(data);
      }
      setColumnModal({ open: false });
      setColumnForm({ column_key: '', column_label: '', column_type: 'text', options: '', sort_order: 0, visible: true, width: 100, editable: true, required: false });
      loadCustomColumns();
    } catch (error: any) {
      alert(error.response?.data?.error || '操作失败');
    }
  };

  const handleColumnDelete = async (id: number) => {
    if (!confirm('确定要删除该列吗？')) return;
    try {
      await customColumnApi.delete(id);
      loadCustomColumns();
    } catch (error: any) {
      alert(error.response?.data?.error || '删除失败');
    }
  };

  // 内联编辑字段名称
  const startInlineEdit = (col: CustomColumn) => {
    setInlineEditId(col.id);
    setInlineEditValue(col.column_label);
  };

  const saveInlineEdit = async () => {
    if (!inlineEditId || !inlineEditValue.trim()) return;
    try {
      await customColumnApi.update(inlineEditId as number, { column_label: inlineEditValue.trim() });
      setInlineEditId(null);
      setInlineEditValue('');
      loadCustomColumns();
      loadEnvironments(); // 刷新环境列表以更新表头
    } catch (error: any) {
      alert(error.response?.data?.error || '保存失败');
    }
  };

  const cancelInlineEdit = () => {
    setInlineEditId(null);
    setInlineEditValue('');
  };

  // 保存基础字段的内联编辑
  const saveBaseFieldInlineEdit = async (fieldKey: string) => {
    if (!inlineEditValue.trim()) return;
    const newLabels = { ...baseFieldLabels, [fieldKey]: inlineEditValue.trim() };
    try {
      await saveBaseFieldLabels(newLabels);
      setInlineEditId(null);
      setInlineEditValue('');
    } catch (error: any) {
      alert(error.response?.data?.error || '保存失败');
    }
  };

  const openColumnModal = (column?: CustomColumn) => {
    if (column) {
      setColumnForm({
        column_key: column.column_key,
        column_label: column.column_label,
        column_type: column.column_type,
        options: Array.isArray(column.options) ? column.options.join(', ') : '',
        sort_order: column.sort_order,
        visible: column.visible,
        width: column.width,
        editable: column.editable,
        required: column.required
      });
      setColumnModal({ open: true, data: column });
    } else {
      setColumnForm({ column_key: '', column_label: '', column_type: 'text', options: '', sort_order: 0, visible: true, width: 100, editable: true, required: false });
      setColumnModal({ open: true });
    }
  };

  const handleEnvDelete = async (id: number) => {
    if (!confirm('确定要删除该环境吗？')) return;
    try {
      await environmentApi.delete(id);
      loadEnvironments();
    } catch (error: any) {
      alert(error.response?.data?.error || '删除失败');
    }
  };

  // 批量选择
  const toggleSelectAllEnvs = () => {
    if (selectedEnvs.length === environments.length) {
      setSelectedEnvs([]);
    } else {
      setSelectedEnvs(environments.map(e => e.id));
    }
  };

  const toggleSelectEnv = (id: number) => {
    if (selectedEnvs.includes(id)) {
      setSelectedEnvs(selectedEnvs.filter(e => e !== id));
    } else {
      setSelectedEnvs([...selectedEnvs, id]);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedEnvs.length === 0) return;
    const envNames = environments.filter(e => selectedEnvs.includes(e.id)).map(e => e.name).join('、');
    if (!confirm(`确定要删除以下环境吗？\n${envNames}\n\n此操作不可恢复！`)) return;
    
    try {
      for (const id of selectedEnvs) {
        await environmentApi.delete(id);
      }
      setSelectedEnvs([]);
      setBatchDeleteModal(false);
      loadEnvironments();
      alert(`成功删除 ${selectedEnvs.length} 个环境`);
    } catch (error: any) {
      alert(error.response?.data?.error || '批量删除失败');
    }
  };

  // 批量编辑状态
  const handleBatchEdit = async () => {
    if (selectedEnvs.length === 0 || !batchEditData.status) return;
    try {
      for (const id of selectedEnvs) {
        await environmentApi.update(id, { status: batchEditData.status as 'active' | 'disabled' });
      }
      setSelectedEnvs([]);
      setBatchEditModal(false);
      setBatchEditData({ status: '' });
      loadEnvironments();
      alert(`成功更新 ${selectedEnvs.length} 个环境`);
    } catch (error: any) {
      alert(error.response?.data?.error || '批量更新失败');
    }
  };

  const openCabinetModal = (cabinet?: Cabinet) => {
    if (cabinet) {
      setCabinetForm({
        name: cabinet.name,
        environment: cabinet.environment || '',
        total_u: cabinet.total_u,
        reserved_u: cabinet.reserved_u || '',
        remark: cabinet.remark || ''
      });
      setCabinetModal({ open: true, data: cabinet });
    } else {
      setCabinetForm({ name: '', environment: '', total_u: 42, reserved_u: '', remark: '' });
      setCabinetModal({ open: true });
    }
  };

  const openEnvModal = (env?: Environment & { customFields?: Record<string, string> }) => {
    if (env) {
      setEnvForm({
        name: env.name,
        code: env.code || '',
        description: env.description || '',
        sort_order: env.sort_order,
        status: env.status
      });
      setEnvModal({ open: true, data: env });
    } else {
      setEnvForm({ name: '', code: '', description: '', sort_order: 0, status: 'active' });
      setEnvModal({ open: true });
    }
  };

  // 编辑环境的自定义字段值
  const handleCustomFieldChange = (envId: number, columnKey: string, value: string) => {
    const updatedEnvs = environments.map(env => {
      if (env.id === envId) {
        return {
          ...env,
          customFields: {
            ...env.customFields,
            [columnKey]: value
          }
        };
      }
      return env;
    });
    setEnvironments(updatedEnvs);
    
    // 保存到后端
    const env = updatedEnvs.find(e => e.id === envId);
    if (env) {
      environmentApi.update(envId, { customFields: env.customFields }).catch(err => {
        console.error('保存自定义字段失败:', err);
        alert('保存自定义字段失败');
      });
    }
  };

  // 开始编辑基础字段
  const startEditCell = (envId: number, field: string, currentValue: string) => {
    setEditingCell({ envId, field });
    setEditValue(currentValue || '');
  };

  // 保存基础字段编辑
  const saveEditCell = async () => {
    if (!editingCell) return;
    const { envId, field } = editingCell;
    
    // 更新本地状态
    const updatedEnvs = environments.map(env => {
      if (env.id === envId) {
        return { ...env, [field]: editValue };
      }
      return env;
    });
    setEnvironments(updatedEnvs);
    setEditingCell(null);
    setEditValue('');

    // 保存到后端
    try {
      await environmentApi.update(envId, { [field]: editValue });
    } catch (err: any) {
      console.error('保存字段失败:', err);
      alert(err.response?.data?.error || '保存失败');
    }
  };

  // 取消编辑
  const cancelEditCell = () => {
    setEditingCell(null);
    setEditValue('');
  };

  return (
    <div className="space-y-4">
      {/* 标签页 */}
      <div className="flex gap-2 border-b border-background-border pb-2">
        <button
          onClick={() => setActiveTab('environments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'environments'
              ? 'bg-primary text-white'
              : 'text-slate-400 hover:text-white hover:bg-background-card'
          }`}
        >
          <Layers size={16} />
          环境管理
        </button>
        <button
          onClick={() => setActiveTab('cabinets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'cabinets'
              ? 'bg-primary text-white'
              : 'text-slate-400 hover:text-white hover:bg-background-card'
          }`}
        >
          <Building2 size={16} />
          机柜管理
        </button>
      </div>

      {activeTab === 'cabinets' && (
        <>
          {/* 机柜筛选和操作 */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <select
                value={cabinetFilter.environment}
                onChange={(e) => setCabinetFilter(f => ({ ...f, environment: e.target.value }))}
                className="bg-background-card border border-background-border rounded-lg px-3 py-1.5 text-sm text-white"
              >
                <option value="">全部环境</option>
                {envList.map(env => (
                  <option key={env} value={env}>{env}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索机柜..."
                value={cabinetFilter.keyword}
                onChange={(e) => setCabinetFilter(f => ({ ...f, keyword: e.target.value }))}
                className="bg-background-card border border-background-border rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-slate-500 w-40"
              />
            </div>
            <button
              onClick={loadCabinets}
              className="flex items-center gap-2 px-3 py-1.5 bg-background-card border border-background-border rounded-lg text-slate-300 hover:text-white"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              刷新
            </button>
            <button
              onClick={handleSyncCabinets}
              disabled={syncing === 'cabinet'}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 border border-green-500 rounded-lg text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Download size={14} className={syncing === 'cabinet' ? 'animate-bounce' : ''} />
              {syncing === 'cabinet' ? '同步中...' : '从服务器同步'}
            </button>
            <button
              onClick={() => openCabinetModal()}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary rounded-lg text-white hover:bg-primary/90"
            >
              <Plus size={14} />
              新增机柜
            </button>
          </div>

          {/* 机柜列表 */}
          <div className="bg-background-card border border-background-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background-border">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">机柜名称</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">所属环境</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">总U位</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">预留U位</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">备注</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">加载中...</td>
                  </tr>
                ) : cabinets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">暂无数据</td>
                  </tr>
                ) : (
                  cabinets.map(cabinet => (
                    <tr key={cabinet.id} className="border-t border-background-border hover:bg-background-border/50">
                      <td className="px-4 py-3 text-white">{cabinet.name}</td>
                      <td className="px-4 py-3 text-slate-300">{cabinet.environment || '-'}</td>
                      <td className="px-4 py-3 text-slate-300">{cabinet.total_u}U</td>
                      <td className="px-4 py-3 text-slate-300">{cabinet.reserved_u || '-'}</td>
                      <td className="px-4 py-3 text-slate-400">{cabinet.remark || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openCabinetModal(cabinet)}
                            className="p-1 text-slate-400 hover:text-primary"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleCabinetDelete(cabinet.id)}
                            className="p-1 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'environments' && (
        <>
          {/* 环境筛选和操作 */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <select
                value={envFilter.status}
                onChange={(e) => setEnvFilter(f => ({ ...f, status: e.target.value }))}
                className="bg-background-card border border-background-border rounded-lg px-3 py-1.5 text-sm text-white"
              >
                <option value="">全部状态</option>
                <option value="active">启用</option>
                <option value="disabled">禁用</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索环境..."
                value={envFilter.keyword}
                onChange={(e) => setEnvFilter(f => ({ ...f, keyword: e.target.value }))}
                className="bg-background-card border border-background-border rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-slate-500 w-40"
              />
            </div>
            <button
              onClick={loadEnvironments}
              className="flex items-center gap-2 px-3 py-1.5 bg-background-card border border-background-border rounded-lg text-slate-300 hover:text-white"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              刷新
            </button>
            <button
              onClick={handleSyncEnvironments}
              disabled={syncing === 'environment'}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 border border-green-500 rounded-lg text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Download size={14} className={syncing === 'environment' ? 'animate-bounce' : ''} />
              {syncing === 'environment' ? '同步中...' : '从服务器同步'}
            </button>
            <button
              onClick={() => openEnvModal()}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary rounded-lg text-white hover:bg-primary/90"
            >
              <Plus size={14} />
              新增环境
            </button>
            <button
              onClick={() => { setColumnConfigModal(true); loadBaseFieldLabels(); }}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 border border-purple-500 rounded-lg text-white hover:bg-purple-700"
            >
              <Columns size={14} />
              字段管理
            </button>
          </div>

          {/* 环境列表 */}
          <div className="bg-background-card border border-background-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background-border">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-slate-400 w-10">
                    <button
                      onClick={toggleSelectAllEnvs}
                      className="text-slate-400 hover:text-white transition-colors"
                      title="全选"
                    >
                      {selectedEnvs.length === environments.length && environments.length > 0 ? (
                        <CheckSquare size={18} className="text-primary" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">{getFieldLabel('name', '环境名称')}</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">{getFieldLabel('code', '编码')}</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">{getFieldLabel('description', '描述')}</th>
                  {customColumns.filter(c => c.visible).sort((a, b) => a.sort_order - b.sort_order).map(col => (
                    <th key={col.id} className="text-left px-2 py-2 text-xs font-medium text-slate-400" style={{ width: columnWidths[col.column_key] || 80 }}>
                      {col.column_label}
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">{getFieldLabel('server_count', '服务器数')}</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">{getFieldLabel('sort_order', '排序')}</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">{getFieldLabel('status', '状态')}</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400 w-20">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7 + customColumns.filter(c => c.visible).length} className="text-center py-8 text-slate-400">加载中...</td>
                  </tr>
                ) : environments.length === 0 ? (
                  <tr>
                    <td colSpan={7 + customColumns.filter(c => c.visible).length} className="text-center py-8 text-slate-400">暂无数据</td>
                  </tr>
                ) : (
                  environments.map(env => (
                    <tr key={env.id} className={`border-t border-background-border hover:bg-background-border/50 ${selectedEnvs.includes(env.id) ? 'bg-primary/5' : ''}`}>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleSelectEnv(env.id)}
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          {selectedEnvs.includes(env.id) ? (
                            <CheckSquare size={18} className="text-primary" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{env.name}</td>
                      <td className="px-4 py-3">
                        {editingCell?.envId === env.id && editingCell?.field === 'code' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditCell();
                                if (e.key === 'Escape') cancelEditCell();
                              }}
                              onBlur={saveEditCell}
                              className="w-20 bg-background border border-primary rounded px-2 py-1 text-sm text-white"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div 
                            onClick={() => startEditCell(env.id, 'code', env.code || '')}
                            className="cursor-pointer hover:bg-background-border/50 rounded px-2 py-1 text-slate-300 hover:text-white transition-colors"
                            title="点击编辑"
                          >
                            {env.code || <span className="text-slate-500 italic">点击填写</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingCell?.envId === env.id && editingCell?.field === 'description' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditCell();
                                if (e.key === 'Escape') cancelEditCell();
                              }}
                              onBlur={saveEditCell}
                              className="w-28 bg-background border border-primary rounded px-2 py-1 text-sm text-white"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div 
                            onClick={() => startEditCell(env.id, 'description', env.description || '')}
                            className="cursor-pointer hover:bg-background-border/50 rounded px-2 py-1 text-slate-400 hover:text-white transition-colors"
                            title="点击编辑"
                          >
                            {env.description || <span className="text-slate-500 italic">点击填写</span>}
                          </div>
                        )}
                      </td>
                      {customColumns.filter(c => c.visible).sort((a, b) => a.sort_order - b.sort_order).map(col => {
                        const colWidth = columnWidths[col.column_key] || 80;
                        return (
                        <td key={col.id} className="px-2 py-1.5" style={{ width: colWidth, minWidth: colWidth }}>
                          {col.column_type === 'select' ? (
                            <select
                              value={env.customFields?.[col.column_key] || ''}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleCustomFieldChange(env.id, col.column_key, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-background border border-background-border rounded px-1 py-0.5 text-xs text-slate-300"
                              style={{ width: colWidth - 8, maxWidth: colWidth - 8 }}
                            >
                              <option value="">-</option>
                              {(col.options || []).map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : col.column_type === 'date' ? (
                            <input
                              type="date"
                              value={env.customFields?.[col.column_key] || ''}
                              onChange={(e) => handleCustomFieldChange(env.id, col.column_key, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-background border border-background-border rounded px-1 py-0.5 text-xs text-slate-300"
                              style={{ width: colWidth - 8, maxWidth: colWidth - 8 }}
                            />
                          ) : col.column_type === 'number' ? (
                            <input
                              type="number"
                              value={env.customFields?.[col.column_key] || ''}
                              onChange={(e) => handleCustomFieldChange(env.id, col.column_key, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-background border border-background-border rounded px-1 py-0.5 text-xs text-slate-300"
                              style={{ width: colWidth - 8, maxWidth: colWidth - 8 }}
                            />
                          ) : (
                            <input
                              type="text"
                              value={env.customFields?.[col.column_key] || ''}
                              onChange={(e) => handleCustomFieldChange(env.id, col.column_key, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-background border border-background-border rounded px-1 py-0.5 text-xs text-slate-300"
                              style={{ width: colWidth - 8, maxWidth: colWidth - 8 }}
                              placeholder="-"
                            />
                          )}
                        </td>
                        );
                      })}
                      <td className="px-4 py-3 text-primary font-medium">{envServerCounts[env.name] || 0}</td>
                      <td className="px-4 py-3">
                        {editingCell?.envId === env.id && editingCell?.field === 'sort_order' ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditCell();
                              if (e.key === 'Escape') cancelEditCell();
                            }}
                            onBlur={saveEditCell}
                            className="w-16 bg-background border border-primary rounded px-2 py-1 text-sm text-white"
                            autoFocus
                          />
                        ) : (
                          <div 
                            onClick={() => startEditCell(env.id, 'sort_order', String(env.sort_order))}
                            className="cursor-pointer hover:bg-background-border/50 rounded px-2 py-1 text-slate-300 hover:text-white transition-colors text-center"
                            title="点击编辑"
                          >
                            {env.sort_order}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={env.status}
                          onChange={(e) => {
                            e.stopPropagation();
                            environmentApi.update(env.id, { status: e.target.value as 'active' | 'disabled' }).then(() => {
                              loadEnvironments();
                            }).catch((err: any) => {
                              alert(err.response?.data?.error || '更新状态失败');
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`px-2 py-0.5 rounded text-xs cursor-pointer ${
                            env.status === 'active' 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                              : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          } hover:opacity-80`}
                        >
                          <option value="active">启用</option>
                          <option value="disabled">禁用</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEnvModal(env)}
                            className="p-1 text-slate-400 hover:text-primary"
                            title="编辑"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleEnvDelete(env.id)}
                            className="p-1 text-slate-400 hover:text-red-500"
                            title="删除"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {/* 批量操作栏 */}
            {selectedEnvs.length > 0 && (
              <div className="px-4 py-3 bg-primary/10 border-t border-primary/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">已选择</span>
                  <span className="text-primary font-medium">{selectedEnvs.length}</span>
                  <span className="text-slate-400">项</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setBatchEditData({ status: '' }); setBatchEditModal(true); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                  >
                    <Edit size={14} />
                    批量编辑
                  </button>
                  <button
                    onClick={() => setBatchDeleteModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                  >
                    <Trash2 size={14} />
                    批量删除
                  </button>
                  <button
                    onClick={() => setSelectedEnvs([])}
                    className="px-3 py-1.5 text-slate-400 hover:text-white text-sm"
                  >
                    取消选择
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 字段管理弹窗 */}
      {columnConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-card border border-background-border rounded-xl w-full max-w-5xl p-6 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-white">字段管理</h3>
                <p className="text-xs text-slate-500 mt-1">管理环境列表的字段，支持编辑基础字段和自定义字段的显示名称</p>
              </div>
              <button onClick={() => setColumnConfigModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4 flex items-center gap-4">
              <button
                onClick={() => openColumnModal()}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary rounded-lg text-white hover:bg-primary/90 text-sm"
              >
                <Plus size={14} />
                新增自定义字段
              </button>
              <span className="text-xs text-slate-500">
                基础字段 {BASE_FIELDS.length} 个 | 自定义字段 {customColumns.length} 个 | 点击编辑图标可修改显示名称
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* 基础字段管理 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">系统字段</span>
                  <span className="text-xs text-slate-500">基础字段可自定义显示名称</span>
                </div>
                <div className="bg-background rounded-lg border border-background-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-background-border">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-400">字段标识</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-400">默认名称</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-400">当前显示名称</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-400 w-24">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {BASE_FIELDS.map(field => (
                        <tr key={field.key} className="border-t border-background-border hover:bg-background-border/50">
                          <td className="px-4 py-2">
                            <code className="text-xs bg-background px-2 py-0.5 rounded text-slate-300">{field.key}</code>
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-400">{field.label}</td>
                          <td className="px-4 py-2">
                            {inlineEditId === `base_${field.key}` ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={inlineEditValue}
                                  onChange={(e) => setInlineEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveBaseFieldInlineEdit(field.key);
                                    if (e.key === 'Escape') cancelInlineEdit();
                                  }}
                                  className="flex-1 bg-background border border-primary rounded px-2 py-1 text-sm text-white"
                                  autoFocus
                                />
                                <button
                                  onClick={() => saveBaseFieldInlineEdit(field.key)}
                                  className="p-1 text-green-500 hover:text-green-400"
                                  title="保存"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={cancelInlineEdit}
                                  className="p-1 text-slate-400 hover:text-white"
                                  title="取消"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group">
                                <span className="text-white">
                                  {baseFieldLabels[field.key] || field.label}
                                  {baseFieldLabels[field.key] && (
                                    <span className="ml-1 text-xs text-slate-500">({field.label})</span>
                                  )}
                                </span>
                                {field.editable && (
                                  <button
                                    onClick={() => {
                                      setInlineEditId(`base_${field.key}`);
                                      setInlineEditValue(baseFieldLabels[field.key] || field.label);
                                    }}
                                    className="p-1 text-slate-500 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="编辑名称"
                                  >
                                    <Edit size={14} />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {field.editable ? (
                              <button
                                onClick={() => {
                                  setInlineEditId(`base_${field.key}`);
                                  setInlineEditValue(baseFieldLabels[field.key] || field.label);
                                }}
                                className="p-1 text-slate-400 hover:text-primary"
                                title="编辑"
                              >
                                <Edit size={14} />
                              </button>
                            ) : (
                              <span className="text-xs text-slate-500">不可编辑</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 自定义字段管理 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">自定义字段</span>
                  <span className="text-xs text-slate-500">用户添加的自定义字段</span>
                </div>
                <div className="bg-background rounded-lg border border-background-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-background-border sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-400">字段标识</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-400">显示名称</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-400">类型</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-400">选项</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-400 w-16">排序</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-400 w-16">宽度</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-400 w-20">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customColumns.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-6 text-slate-400">暂无自定义字段，点击上方按钮添加</td>
                        </tr>
                      ) : (
                        customColumns.map(col => (
                          <tr key={col.id} className="border-t border-background-border hover:bg-background-border/50">
                            <td className="px-4 py-2">
                              <code className="text-xs bg-background px-2 py-0.5 rounded text-slate-300">{col.column_key}</code>
                            </td>
                            <td className="px-4 py-2">
                              {inlineEditId === col.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={inlineEditValue}
                                    onChange={(e) => setInlineEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveInlineEdit();
                                      if (e.key === 'Escape') cancelInlineEdit();
                                    }}
                                    className="flex-1 bg-background border border-primary rounded px-2 py-1 text-sm text-white"
                                    autoFocus
                                  />
                                  <button
                                    onClick={saveInlineEdit}
                                    className="p-1 text-green-500 hover:text-green-400"
                                    title="保存"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={cancelInlineEdit}
                                    className="p-1 text-slate-400 hover:text-white"
                                    title="取消"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 group">
                                  <span className="text-white">{col.column_label}</span>
                                  <button
                                    onClick={() => startInlineEdit(col)}
                                    className="p-1 text-slate-500 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="编辑名称"
                                  >
                                    <Edit size={14} />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                col.column_type === 'select' ? 'bg-purple-500/20 text-purple-400' :
                                col.column_type === 'date' ? 'bg-blue-500/20 text-blue-400' :
                                col.column_type === 'number' ? 'bg-green-500/20 text-green-400' :
                                'bg-slate-500/20 text-slate-400'
                              }`}>
                                {col.column_type === 'text' ? '文本' :
                                 col.column_type === 'number' ? '数字' :
                                 col.column_type === 'select' ? '下拉' :
                                 col.column_type === 'date' ? '日期' : col.column_type}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <span className="text-xs text-slate-400">
                                {col.options && col.options.length > 0 ? col.options.join(', ') : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-slate-300 text-xs">{col.sort_order}</td>
                            <td className="px-4 py-2 text-slate-300 text-xs">{col.width}px</td>
                            <td className="px-4 py-2">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openColumnModal(col)}
                                  className="p-1 text-slate-400 hover:text-primary"
                                  title="编辑完整配置"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => handleColumnDelete(col.id)}
                                  className="p-1 text-slate-400 hover:text-red-500"
                                  title="删除"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-4 pt-4 border-t border-background-border">
              <button
                onClick={() => setColumnConfigModal(false)}
                className="px-4 py-2 bg-primary rounded-lg text-white hover:bg-primary/90"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 字段编辑弹窗 */}
      {columnModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-background-card border border-background-border rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">
                {columnModal.data ? '编辑字段' : '新增字段'}
              </h3>
              <button onClick={() => setColumnModal({ open: false })} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            {columnModal.data && (
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-400">
                  编辑模式：可修改显示名称、排序、宽度等属性
                </p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  字段标识 {columnModal.data ? '' : '*'}
                </label>
                <input
                  type="text"
                  value={columnForm.column_key}
                  onChange={(e) => setColumnForm(f => ({ ...f, column_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                  className="w-full bg-background border border-background-border rounded-lg px-3 py-2 text-white"
                  placeholder="如: custom_field"
                  disabled={!!columnModal.data?.id}
                />
                <p className="text-xs text-slate-500 mt-1">
                  {columnModal.data ? '字段标识不可修改' : '只能是字母、数字和下划线'}
                </p>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  显示名称 {columnModal.data ? '(可直接修改)' : '*'}
                </label>
                <input
                  type="text"
                  value={columnForm.column_label}
                  onChange={(e) => setColumnForm(f => ({ ...f, column_label: e.target.value }))}
                  className="w-full bg-background border border-background-border rounded-lg px-3 py-2 text-white"
                  placeholder="如: 架构"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {columnModal.data ? '修改后列表表头显示名称将同步更新' : '如: 编码、环境说明等'}
                </p>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">字段类型</label>
                <select
                  value={columnForm.column_type}
                  onChange={(e) => setColumnForm(f => ({ ...f, column_type: e.target.value }))}
                  className="w-full bg-background border border-background-border rounded-lg px-3 py-2 text-white"
                >
                  <option value="text">文本</option>
                  <option value="number">数字</option>
                  <option value="select">下拉选择</option>
                  <option value="date">日期</option>
                </select>
              </div>
              {columnForm.column_type === 'select' && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">选项（逗号分隔）</label>
                  <input
                    type="text"
                    value={columnForm.options}
                    onChange={(e) => setColumnForm(f => ({ ...f, options: e.target.value }))}
                    className="w-full bg-background border border-background-border rounded-lg px-3 py-2 text-white"
                    placeholder="如: 选项1, 选项2, 选项3"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">排序</label>
                  <input
                    type="number"
                    value={columnForm.sort_order}
                    onChange={(e) => setColumnForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-background border border-background-border rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">列宽(px)</label>
                  <input
                    type="number"
                    value={columnForm.width}
                    onChange={(e) => setColumnForm(f => ({ ...f, width: parseInt(e.target.value) || 100 }))}
                    className="w-full bg-background border border-background-border rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setColumnModal({ open: false })}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                取消
              </button>
              <button
                onClick={handleColumnSave}
                disabled={!columnForm.column_key || !columnForm.column_label}
                className="flex items-center gap-2 px-4 py-2 bg-primary rounded-lg text-white hover:bg-primary/90 disabled:opacity-50"
              >
                <Check size={16} />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 机柜弹窗 */}
      {cabinetModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-card border border-background-border rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">
                {cabinetModal.data ? '编辑机柜' : '新增机柜'}
              </h3>
              <button onClick={() => setCabinetModal({ open: false })} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">机柜名称 *</label>
                <input
                  type="text"
                  value={cabinetForm.name}
                  onChange={(e) => setCabinetForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-background border border-background-border rounded-lg px-3 py-2 text-white"
                  placeholder="如: T1-L5-001"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">所属环境</label>
                <select
                  value={cabinetForm.environment}
                  onChange={(e) => setCabinetForm(f => ({ ...f, environment: e.target.value }))}
                  className="w-full bg-background border border-background-border rounded-lg px-3 py-2 text-white"
                >
                  <option value="">请选择环境</option>
                  {envList.map(env => (
                    <option key={env} value={env}>{env}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">总U位数</label>
                <input
                  type="number"
                  value={cabinetForm.total_u}
                  onChange={(e) => setCabinetForm(f => ({ ...f, total_u: parseInt(e.target.value) || 42 }))}
                  className="w-full bg-background border border-background-border rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">预留U位</label>
                <input
                  type="text"
                  value={cabinetForm.reserved_u}
                  onChange={(e) => setCabinetForm(f => ({ ...f, reserved_u: e.target.value }))}
                  className="w-full bg-background border border-background-border rounded-lg px-3 py-2 text-white"
                  placeholder="如: 1-2,40-42"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">备注</label>
                <textarea
                  value={cabinetForm.remark}
                  onChange={(e) => setCabinetForm(f => ({ ...f, remark: e.target.value }))}
                  className="w-full bg-background border border-background-border rounded-lg px-3 py-2 text-white resize-none"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setCabinetModal({ open: false })}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                取消
              </button>
              <button
                onClick={handleCabinetSave}
                disabled={!cabinetForm.name}
                className="flex items-center gap-2 px-4 py-2 bg-primary rounded-lg text-white hover:bg-primary/90 disabled:opacity-50"
              >
                <Check size={16} />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 环境弹窗 */}
      {envModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-card border border-background-border rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">
                {envModal.data ? '编辑环境' : '新增环境'}
              </h3>
              <button onClick={() => setEnvModal({ open: false })} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">环境名称 *</label>
                <input
                  type="text"
                  value={envForm.name}
                  onChange={(e) => setEnvForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-background border border-background-border rounded-lg px-3 py-2 text-white"
                  placeholder="如: 生产环境"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">编码</label>
                <input
                  type="text"
                  value={envForm.code}
                  onChange={(e) => setEnvForm(f => ({ ...f, code: e.target.value }))}
                  className="w-full bg-background border border-background-border rounded-lg px-3 py-2 text-white"
                  placeholder="如: prod"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">描述</label>
                <textarea
                  value={envForm.description}
                  onChange={(e) => setEnvForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-background border border-background-border rounded-lg px-3 py-2 text-white resize-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">排序</label>
                <input
                  type="number"
                  value={envForm.sort_order}
                  onChange={(e) => setEnvForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-background border border-background-border rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">状态</label>
                <select
                  value={envForm.status}
                  onChange={(e) => setEnvForm(f => ({ ...f, status: e.target.value as 'active' | 'disabled' }))}
                  className="w-full bg-background border border-background-border rounded-lg px-3 py-2 text-white"
                >
                  <option value="active">启用</option>
                  <option value="disabled">禁用</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEnvModal({ open: false })}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                取消
              </button>
              <button
                onClick={handleEnvSave}
                disabled={!envForm.name}
                className="flex items-center gap-2 px-4 py-2 bg-primary rounded-lg text-white hover:bg-primary/90 disabled:opacity-50"
              >
                <Check size={16} />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量删除确认弹窗 */}
      {batchDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-card border border-background-border rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">确认批量删除</h3>
              <button onClick={() => setBatchDeleteModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="mb-6">
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                <div className="text-sm text-red-400">
                  <p className="font-medium">即将删除以下 {selectedEnvs.length} 个环境</p>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto bg-background rounded-lg p-3">
                {environments.filter(e => selectedEnvs.includes(e.id)).map(env => (
                  <div key={env.id} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-white">{env.name}</span>
                    <span className="text-slate-400">{envServerCounts[env.name] || 0} 台服务器</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-slate-400">删除后无法恢复，请确认是否继续？</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setBatchDeleteModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                取消
              </button>
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-white hover:bg-red-700"
              >
                <Trash2 size={16} />
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量编辑弹窗 */}
      {batchEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-card border border-background-border rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">批量编辑状态</h3>
              <button onClick={() => setBatchEditModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-sm text-slate-400 mb-4">
                将更新以下 {selectedEnvs.length} 个环境的状态：
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {environments.filter(e => selectedEnvs.includes(e.id)).map(env => (
                  <span key={env.id} className="px-2 py-1 bg-primary/20 text-primary rounded text-xs">
                    {env.name}
                  </span>
                ))}
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">新状态</label>
                <select
                  value={batchEditData.status}
                  onChange={(e) => setBatchEditData({ status: e.target.value })}
                  className="w-full bg-background border border-background-border rounded-lg px-3 py-2 text-white"
                >
                  <option value="">请选择状态</option>
                  <option value="active">启用</option>
                  <option value="disabled">禁用</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setBatchEditModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                取消
              </button>
              <button
                onClick={handleBatchEdit}
                disabled={!batchEditData.status}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Check size={16} />
                确认更新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
