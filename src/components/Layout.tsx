import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Server, 
  History, 
  Settings, 
  LogOut,
  Menu,
  ChevronLeft,
  Building2,
  Cog,
  ClipboardList,
  Layers,
  DollarSign
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: '仪表盘' },
  { path: '/servers', icon: Server, label: '服务器' },
  { path: '/cabinets', icon: Building2, label: '机柜视图' },
  { path: '/config', icon: Cog, label: '环境规划' },
  { path: '/cost', icon: DollarSign, label: '成本管理' },
  { path: '/history', icon: History, label: '变更历史' },
  { path: '/audit', icon: ClipboardList, label: '操作审计' },
  { path: '/versions', icon: Layers, label: '版本管理' },
  { path: '/settings', icon: Settings, label: '设置' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout, sidebarCollapsed, toggleSidebar, systemName, platformTitle } = useAppStore();

  return (
    <div className="flex h-screen bg-background">
      {/* 侧边栏 */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-56'} bg-background-card border-r border-background-border flex flex-col transition-all duration-300`}>
        {/* Logo */}
        <div className="h-14 flex items-center justify-center border-b border-background-border">
          {!sidebarCollapsed && (
            <h1 className="text-lg font-semibold text-white">{systemName}</h1>
          )}
          {sidebarCollapsed && (
            <span className="text-xl font-bold text-primary">{systemName[0]}</span>
          )}
        </div>

        {/* 导航 */}
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-slate-400 hover:bg-background-border hover:text-white'
                }`}
              >
                <item.icon size={20} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* 底部用户信息 */}
        <div className="border-t border-background-border p-3">
          {!sidebarCollapsed && user && (
            <div className="flex items-center gap-2 px-2 py-1 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium">
                {user.display_name?.[0] || user.username[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{user.display_name}</div>
                <div className="text-xs text-slate-500 truncate">{user.role}</div>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-background-border hover:text-red-400 transition-colors"
          >
            <LogOut size={18} />
            {!sidebarCollapsed && <span>退出登录</span>}
          </button>
        </div>

        {/* 折叠按钮 */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 w-6 h-6 bg-background-card border border-background-border rounded-full flex items-center justify-center text-slate-400 hover:text-white"
        >
          {sidebarCollapsed ? <Menu size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部Header */}
        <header className="h-14 bg-background-card border-b border-background-border flex items-center justify-between px-6">
          <div className="text-sm text-slate-400">
            {platformTitle}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              {new Date().toLocaleDateString('zh-CN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </span>
          </div>
        </header>

        {/* 页面内容 */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
