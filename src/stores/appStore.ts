import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Server, ServerStats, ChangeLog } from '../types';

interface AppState {
  // 用户状态
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  
  // 服务器状态
  servers: Server[];
  serverStats: ServerStats | null;
  selectedServer: Server | null;
  setServers: (servers: Server[]) => void;
  setServerStats: (stats: ServerStats) => void;
  setSelectedServer: (server: Server | null) => void;
  
  // 变更日志
  changeLogs: ChangeLog[];
  setChangeLogs: (logs: ChangeLog[]) => void;
  
  // UI状态
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  
  // 系统配置
  systemName: string;
  platformTitle: string;
  setSystemConfig: (systemName: string, platformTitle: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // 用户状态
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, isAuthenticated: false });
      },
  
  // 服务器状态
  servers: [],
  serverStats: null,
  selectedServer: null,
  setServers: (servers) => set({ servers }),
  setServerStats: (serverStats) => set({ serverStats }),
  setSelectedServer: (selectedServer) => set({ selectedServer }),
  
  // 变更日志
  changeLogs: [],
  setChangeLogs: (changeLogs) => set({ changeLogs }),
  
  // UI状态
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // 系统配置
  systemName: 'CMDB',
  platformTitle: '研发环境服务器管理平台',
  setSystemConfig: (systemName, platformTitle) => set({ systemName, platformTitle }),
    }),
    {
      name: 'cmdb-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        systemName: state.systemName,
        platformTitle: state.platformTitle,
      }),
    }
  )
);
