# CMDB 平台

研发环境服务器管理系统 - 一款面向研发团队的 CMDB (Configuration Management Database) 平台。

## 功能特性

- **服务器管理** - 服务器资产全生命周期管理，支持批量导入导出
- **机柜配置** - 可视化机柜 U 位管理
- **环境规划** - 环境配置与自定义字段管理
- **标签管理** - 灵活的标签分类体系
- **变更记录** - 完整的服务器状态变更历史
- **操作审计** - 全面的操作日志审计功能
- **版本快照** - 数据快照与版本回退
- **用户权限** - 角色权限管理 (管理员/运维/研发)

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 状态管理 | Zustand |
| 后端 | Express 5 + better-sqlite3 |
| 表格 | TanStack Table |
| 图表 | Recharts |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式 (前后端同时启动)
npm run dev:all

# 或分别启动
npm run dev      # 前端 http://localhost:5173
npm run server   # 后端 http://localhost:3213

# 构建生产版本
npm run build
```

## 默认账号

```
用户名: admin
密码: admin
```

## 项目结构

```
cmdb-platform/
├── src/                    # 前端源代码
│   ├── pages/              # 页面组件
│   ├── components/         # 公共组件
│   ├── services/          # API 服务
│   ├── stores/            # 状态管理
│   └── types/             # 类型定义
├── server/                 # 后端源代码
│   ├── routes/            # API 路由
│   ├── middleware/        # 中间件
│   └── database.ts        # 数据库
├── data/                   # 数据目录
└── ARCHITECTURE.md         # 架构文档
```

## 许可证

MIT
