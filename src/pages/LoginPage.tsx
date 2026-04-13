import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User } from 'lucide-react';
import { userApi } from '../services/api';
import { useAppStore } from '../stores/appStore';

export function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAppStore((state) => state.setUser);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 如果已经登录，直接跳转到 dashboard
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await userApi.login(username, password);
      localStorage.setItem('token', response.token);
      setUser(response.user);
      navigate('/dashboard');
    } catch (err: any) {
      // 增强错误处理
      if (err.response) {
        setError(err.response.data?.error || '登录失败');
      } else if (err.request) {
        setError('网络请求失败，请检查后端服务是否启动');
      } else {
        setError(err.message || '登录失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white">CMDB 平台</h1>
          <p className="text-slate-400 mt-2">研发环境服务器管理</p>
        </div>

        {/* 登录表单 */}
        <div className="bg-background-card rounded-2xl p-8 border border-background-border shadow-xl">
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* 用户名 */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">用户名</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-background border border-background-border rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
                    placeholder="请输入用户名"
                    required
                  />
                </div>
              </div>

              {/* 密码 */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background border border-background-border rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
                    placeholder="请输入密码"
                    required
                  />
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">
                  {error}
                </div>
              )}

              {/* 登录按钮 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-all hover:shadow-lg hover:shadow-primary/25"
              >
                {loading ? '登录中...' : '登 录'}
              </button>
            </div>
          </form>

          {/* 提示 */}
          <div className="mt-6 text-center text-sm text-slate-500">
            默认账号: admin / admin
          </div>
        </div>
      </div>
    </div>
  );
}
