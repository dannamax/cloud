import { useEffect, useState, useMemo } from 'react';
import { Settings, Users, Database, Download, Trash2, Plus, Eye, EyeOff, Shield, Check, X, Lock } from 'lucide-react';
import { settingsApi, userApi } from '../services/api';
import type { Settings as SettingsType, User } from '../types';
import { useAppStore } from '../stores/appStore';

// 密码复杂度校验规则
const PASSWORD_RULES = [
  { id: 'length', label: '至少8个字符', test: (p: string) => p.length >= 8 },
  { id: 'upper', label: '包含大写字母', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: '包含小写字母', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: '包含数字', test: (p: string) => /\d/.test(p) },
  { id: 'special', label: '包含特殊字符', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

// 计算密码强度
function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: '', color: '' };
  const passedRules = PASSWORD_RULES.filter(r => r.test(password)).length;
  
  if (passedRules <= 2) return { level: 1, label: '弱', color: 'bg-red-500' };
  if (passedRules <= 3) return { level: 2, label: '中等', color: 'bg-yellow-500' };
  if (passedRules <= 4) return { level: 3, label: '良好', color: 'bg-blue-500' };
  return { level: 4, label: '强', color: 'bg-green-500' };
}

// 角色权限说明
const ROLE_PERMISSIONS = {
  admin: {
    label: '管理员',
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    permissions: ['系统配置', '用户管理', '服务器管理', '数据管理', '审计日志']
  },
  operator: {
    label: '运维工程师',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    permissions: ['服务器管理', '服务器监控', '变更记录']
  },
  developer: {
    label: '研发人员',
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    permissions: ['查看服务器', '查看监控', '查看变更记录']
  }
};

export function SettingsPage() {
  const { user: currentUser } = useAppStore();
  const [settings, setSettings] = useState<SettingsType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('monitor');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // 当前用户密码修改
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    display_name: '',
    role: 'operator',
  });

  const passwordStrength = useMemo(() => getPasswordStrength(userForm.password), [userForm.password]);
  const passwordRulesPassed = useMemo(() => 
    PASSWORD_RULES.map(r => ({ ...r, passed: r.test(userForm.password) })),
    [userForm.password]
  );

  const fetchData = async () => {
    try {
      const [settingsData, usersData] = await Promise.all([
        settingsApi.getAll(),
        userApi.getAll(),
      ]);
      setSettings(settingsData);
      setUsers(usersData);
    } catch (error) {
      console.error('获取数据失败:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSettingUpdate = async (key: string, value: string) => {
    try {
      await settingsApi.update(key, value);
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    } catch (error) {
      console.error('更新设置失败:', error);
    }
  };

  const handleExport = async () => {
    try {
      const data = await settingsApi.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cmdb-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  // 修改当前用户密码
  const handleChangePassword = async () => {
    setPasswordError('');

    // 验证新密码
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      return;
    }

    const strength = getPasswordStrength(passwordForm.newPassword);
    if (strength.level < 2) {
      setPasswordError('密码强度不足，请使用更强的密码');
      return;
    }

    try {
      await userApi.changePassword(currentUser!.id, passwordForm.oldPassword, passwordForm.newPassword);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      alert('密码修改成功');
    } catch (error: any) {
      setPasswordError(error.response?.data?.error || '密码修改失败');
    }
  };

  const handleUserSave = async () => {
    // 验证密码
    if (!editingUser && !userForm.password) {
      setPasswordError('请输入密码');
      return;
    }

    if (userForm.password) {
      const strength = getPasswordStrength(userForm.password);
      if (strength.level < 2) {
        setPasswordError('密码强度不足，请使用更强的密码');
        return;
      }
    }

    setPasswordError('');
    try {
      if (editingUser) {
        await userApi.update(editingUser.id, {
          display_name: userForm.display_name,
          role: userForm.role as any,
          status: editingUser.status,
          password: userForm.password || undefined,
        });
      } else {
        await userApi.create(userForm);
      }
      setEditingUser(null);
      setUserForm({ username: '', password: '', display_name: '', role: 'operator' });
      fetchData();
    } catch (error: any) {
      setPasswordError(error.response?.data?.error || '保存用户失败');
    }
  };

  const handleUserDelete = async (id: number) => {
    if (!confirm('确定要删除这个用户吗？此操作不可恢复。')) return;
    try {
      await userApi.delete(id);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '删除用户失败');
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    if (user.username === 'admin') {
      alert('不能禁用管理员账号');
      return;
    }
    try {
      await userApi.update(user.id, {
        status: user.status === 'active' ? 'disabled' : 'active'
      });
      fetchData();
    } catch (error) {
      console.error('切换状态失败:', error);
    }
  };

  const tabs = [
    { id: 'monitor', label: '监控设置', icon: Settings },
    { id: 'users', label: '用户管理', icon: Users },
    { id: 'account', label: '账户安全', icon: Shield },
    { id: 'data', label: '数据管理', icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">系统设置</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-background-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 监控设置 */}
      {activeTab === 'monitor' && (
        <div className="bg-background-card border border-background-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">监控配置</h2>
          <div className="space-y-6">
            {settings.map((setting) => (
              <div key={setting.id} className="flex items-center justify-between py-3 border-b border-background-border last:border-0">
                <div>
                  <p className="text-white font-medium">{setting.description}</p>
                  <p className="text-sm text-slate-500 mt-1">键: {setting.key}</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={setting.value}
                    onChange={(e) => setSettings(prev => prev.map(s => s.key === setting.key ? { ...s, value: e.target.value } : s))}
                    onBlur={() => handleSettingUpdate(setting.key, setting.value)}
                    className="w-24 bg-background border border-background-border rounded-lg px-3 py-2 text-white text-center"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 用户管理 */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* 用户列表 */}
          <div className="bg-background-card border border-background-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">用户列表</h2>
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setPasswordError('');
                    setUserForm({ username: '', password: '', display_name: '', role: 'operator' });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary rounded-lg text-white hover:bg-primary/90 transition-colors"
                >
                  <Plus size={16} />
                  新增用户
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <div key={user.id} className="p-4 bg-background rounded-xl border border-background-border hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold ${ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS]?.bg || 'bg-slate-500/20'} ${ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS]?.color || 'text-slate-400'}`}>
                        {user.display_name?.[0] || user.username[0]}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.display_name}</p>
                        <p className="text-sm text-slate-500">@{user.username}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${user.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                      {user.status === 'active' ? '正常' : '禁用'}
                    </span>
                  </div>

                  <div className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded ${ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS]?.bg || 'bg-slate-500/20'} ${ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS]?.color || 'text-slate-400'}`}>
                    <Shield size={12} />
                    {ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS]?.label || user.role}
                  </div>

                  {currentUser?.role === 'admin' && user.username !== 'admin' && (
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-background-border">
                      <button
                        onClick={() => handleToggleUserStatus(user)}
                        className={`flex-1 py-1.5 text-xs rounded ${user.status === 'active' ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'} transition-colors`}
                      >
                        {user.status === 'active' ? '禁用' : '启用'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setPasswordError('');
                          setUserForm({
                            username: user.username,
                            password: '',
                            display_name: user.display_name,
                            role: user.role,
                          });
                        }}
                        className="flex-1 py-1.5 text-xs bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleUserDelete(user.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 用户编辑表单 */}
          {(editingUser || userForm.username || !editingUser && !userForm.username) && (editingUser !== null || userForm.username || activeTab === 'users') && (
            <div className="bg-background-card border border-background-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                {editingUser ? '编辑用户' : '新增用户'}
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 左侧：表单 */}
                <div className="space-y-4">
                  {!editingUser && (
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">用户名</label>
                      <input
                        type="text"
                        value={userForm.username}
                        onChange={(e) => setUserForm(f => ({ ...f, username: e.target.value }))}
                        className="w-full bg-background border border-background-border rounded-lg px-4 py-2.5 text-white"
                        placeholder="请输入用户名"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">{editingUser ? '新密码（留空则不变）' : '密码'}</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={userForm.password}
                        onChange={(e) => setUserForm(f => ({ ...f, password: e.target.value }))}
                        className="w-full bg-background border border-background-border rounded-lg px-4 py-2.5 pr-10 text-white"
                        placeholder={editingUser ? '留空保持原密码' : '请输入密码'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {userForm.password && (
                    <>
                      {/* 密码强度指示器 */}
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-slate-500">密码强度：</span>
                          <div className="flex gap-1 flex-1">
                            {[1, 2, 3, 4].map((level) => (
                              <div
                                key={level}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${
                                  passwordStrength.level >= level ? passwordStrength.color : 'bg-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                          <span className={`text-xs font-medium ${passwordStrength.color.replace('bg-', 'text-').replace('-500', '-400')}`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                      </div>

                      {/* 密码规则检查 */}
                      <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-background rounded-lg">
                        {passwordRulesPassed.map((rule) => (
                          <div key={rule.id} className="flex items-center gap-2 text-xs">
                            {rule.passed ? (
                              <Check size={14} className="text-green-400" />
                            ) : (
                              <X size={14} className="text-slate-500" />
                            )}
                            <span className={rule.passed ? 'text-green-400' : 'text-slate-500'}>
                              {rule.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">显示名称</label>
                    <input
                      type="text"
                      value={userForm.display_name}
                      onChange={(e) => setUserForm(f => ({ ...f, display_name: e.target.value }))}
                      className="w-full bg-background border border-background-border rounded-lg px-4 py-2.5 text-white"
                      placeholder="请输入显示名称"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">角色权限</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full bg-background border border-background-border rounded-lg px-4 py-2.5 text-white"
                    >
                      <option value="admin">管理员</option>
                      <option value="operator">运维工程师</option>
                      <option value="developer">研发人员</option>
                    </select>
                  </div>

                  {passwordError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                      {passwordError}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => {
                        setEditingUser(null);
                        setUserForm({ username: '', password: '', display_name: '', role: 'operator' });
                        setPasswordError('');
                      }}
                      className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleUserSave}
                      className="px-6 py-2 bg-primary rounded-lg text-white hover:bg-primary/90 transition-colors"
                    >
                      保存
                    </button>
                  </div>
                </div>

                {/* 右侧：角色权限说明 */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-400">角色权限说明</h4>
                  <div className="space-y-3">
                    {Object.entries(ROLE_PERMISSIONS).map(([key, role]) => (
                      <div
                        key={key}
                        onClick={() => !editingUser && setUserForm(f => ({ ...f, role: key }))}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          userForm.role === key
                            ? 'border-primary bg-primary/10'
                            : 'border-background-border hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Shield size={16} className={role.color} />
                          <span className={`font-medium ${role.color}`}>{role.label}</span>
                          {userForm.role === key && (
                            <Check size={16} className="text-primary ml-auto" />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {role.permissions.map((perm) => (
                            <span key={perm} className={`text-xs px-2 py-0.5 rounded ${role.bg} ${role.color}`}>
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 账户安全 */}
      {activeTab === 'account' && (
        <div className="bg-background-card border border-background-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Lock size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">账户安全</h2>
              <p className="text-sm text-slate-500">修改密码，保护账户安全</p>
            </div>
          </div>

          <div className="max-w-lg space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">当前密码</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm(f => ({ ...f, oldPassword: e.target.value }))}
                  className="w-full bg-background border border-background-border rounded-lg px-4 py-2.5 pr-10 text-white"
                  placeholder="请输入当前密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">新密码</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                  className="w-full bg-background border border-background-border rounded-lg px-4 py-2.5 pr-10 text-white"
                  placeholder="请输入新密码"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {passwordForm.newPassword && (
              <>
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-500">密码强度：</span>
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3, 4].map((level) => {
                        const strength = getPasswordStrength(passwordForm.newPassword);
                        return (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              strength.level >= level ? strength.color : 'bg-slate-700'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <span className={`text-xs font-medium ${getPasswordStrength(passwordForm.newPassword).color.replace('bg-', 'text-').replace('-500', '-400')}`}>
                      {getPasswordStrength(passwordForm.newPassword).label}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 bg-background rounded-lg">
                  {PASSWORD_RULES.map((rule) => {
                    const passed = rule.test(passwordForm.newPassword);
                    return (
                      <div key={rule.id} className="flex items-center gap-2 text-xs">
                        {passed ? (
                          <Check size={14} className="text-green-400" />
                        ) : (
                          <X size={14} className="text-slate-500" />
                        )}
                        <span className={passed ? 'text-green-400' : 'text-slate-500'}>
                          {rule.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm text-slate-400 mb-2">确认新密码</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  className="w-full bg-background border border-background-border rounded-lg px-4 py-2.5 pr-10 text-white"
                  placeholder="请再次输入新密码"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                <p className="text-xs text-red-400 mt-1">两次输入的密码不一致</p>
              )}
            </div>

            {passwordError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {passwordError}
              </div>
            )}

            <div className="pt-4">
              <button
                onClick={handleChangePassword}
                disabled={!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                className="px-6 py-2.5 bg-primary rounded-lg text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                修改密码
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 数据管理 */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="bg-background-card border border-background-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">数据导出</h2>
            <p className="text-slate-400 mb-4">导出所有服务器数据和变更记录为JSON文件</p>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-primary rounded-lg text-white"
            >
              <Download size={16} />
              导出数据
            </button>
          </div>

          <div className="bg-background-card border border-background-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">数据清理</h2>
            <p className="text-slate-400 mb-4">谨慎操作，此操作不可恢复</p>
            <div className="flex gap-4">
              <button
                onClick={async () => {
                  if (confirm('确定要清空所有服务器数据吗？')) {
                    await settingsApi.clear('servers');
                    alert('已清空服务器数据');
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-status-offline/20 text-status-offline rounded-lg"
              >
                <Trash2 size={16} />
                清空服务器数据
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
