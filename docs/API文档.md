# CMDB 配置管理数据库 - API 接口文档

**基础路径**: `http://localhost:3213/api`

**通用响应格式**:
```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

**错误响应格式**:
```json
{
  "error": "错误信息"
}
```

---

## 1. 服务器管理 `/servers`

### 1.1 获取服务器列表
```
GET /api/servers
```

**Query 参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| environment | string | 环境名称 |
| status | string | 状态 (online/offline/已上架/异动中) |
| role | string | 角色 |
| cabinet | string | 机柜名称 |
| keyword | string | 关键词搜索 (IP/SN/名称) |

**响应**: `Server[]`

---

### 1.2 获取服务器统计
```
GET /api/servers/stats
```

**响应**:
```json
{
  "total": 100,
  "online": 80,
  "offline": 15,
  "inTransit": 5,
  "byEnvironment": [{"environment": "研发", "count": 50}],
  "byRole": [{"role": "KVM", "count": 20}],
  "byCabinet": [{"cabinet": "T1-01", "count": 10}],
  "byRoleAndModel": [...],
  "byRoleType": [...],
  "roleTypes": [...],
  "allServers": [...]
}
```

---

### 1.3 获取单个服务器
```
GET /api/servers/:id
```

---

### 1.4 创建服务器
```
POST /api/servers
```

**请求体**:
```json
{
  "name": "服务器名称",
  "environment": "研发环境",
  "system_ip": "10.0.0.1",
  "manage_ip": "10.0.0.2",
  "oob_ip": "10.0.0.3",
  "mac_address": "00:11:22:33:44:55",
  "cabinet": "T1-01",
  "u_position": 10,
  "u_height": 2,
  "sn": "SN123456",
  "brand": "DELL",
  "model": "R740",
  "cpu": "Intel Xeon",
  "memory": "64GB",
  "disk": "1TB SSD",
  "network_card": "10GbE",
  "role": "KVM",
  "role_type": "compute",
  "tags": "生产,高配",
  "status": "已上架",
  "remark": "备注",
  "purchase_price": 50000,
  "purchase_date": "2024-01-01"
}
```

---

### 1.5 更新服务器
```
PUT /api/servers/:id
```

**请求体**: 同创建，字段可选

---

### 1.6 删除服务器
```
DELETE /api/servers/:id
```

---

### 1.7 批量删除服务器
```
POST /api/servers/batch/delete
```

**请求体**:
```json
{
  "ids": [1, 2, 3]
}
```

---

### 1.8 标记异动
```
POST /api/servers/:id/change
```

**请求体**:
```json
{
  "change_type": "状态变更",
  "after_status": "异动中",
  "operator": "admin",
  "remark": "原因"
}
```

---

### 1.9 批量更新状态
```
POST /api/servers/batch/status
```

**请求体**:
```json
{
  "ids": [1, 2, 3],
  "status": "已上架"
}
```

---

### 1.10 批量SSH端口探测
```
POST /api/servers/batch/port-check
```

**请求体**:
```json
{
  "environment": "研发环境"  // 可选，按环境过滤
}
```

---

## 2. 机柜管理 `/cabinets`

### 2.1 获取机柜列表
```
GET /api/cabinets
```

**Query 参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| environment | string | 环境名称 |
| keyword | string | 关键词搜索 |

---

### 2.2 获取单个机柜
```
GET /api/cabinets/:id
```

---

### 2.3 从服务器同步机柜
```
POST /api/cabinets/sync-with-servers
```

---

### 2.4 创建机柜
```
POST /api/cabinets
```

**请求体**:
```json
{
  "name": "T1-01",
  "environment": "研发环境",
  "total_u": 42,
  "reserved_u": "1-5",
  "remark": "备注"
}
```

---

### 2.5 更新机柜
```
PUT /api/cabinets/:id
```

---

### 2.6 删除机柜
```
DELETE /api/cabinets/:id
```

---

## 3. 环境管理 `/environments`

### 3.1 获取环境列表
```
GET /api/environments
```

**Query 参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 状态 (active/inactive) |
| keyword | string | 关键词搜索 |

---

### 3.2 获取单个环境
```
GET /api/environments/:id
```

---

### 3.3 从服务器同步环境
```
POST /api/environments/sync
```

---

### 3.4 创建环境
```
POST /api/environments
```

**请求体**:
```json
{
  "name": "研发环境",
  "code": "dev",
  "description": "开发测试环境",
  "sort_order": 1,
  "status": "active"
}
```

---

### 3.5 更新环境
```
PUT /api/environments/:id
```

**请求体**:
```json
{
  "name": "研发环境",
  "code": "dev",
  "description": "描述",
  "sort_order": 1,
  "status": "active",
  "customFields": {}
}
```

---

### 3.6 删除环境
```
DELETE /api/environments/:id
```

---

## 4. 标签管理 `/tags`

### 4.1 获取标签列表
```
GET /api/tags
```

**Query 参数**: `keyword` - 关键词搜索

---

### 4.2 获取单个标签
```
GET /api/tags/:id
```

---

### 4.3 创建标签
```
POST /api/tags
```

**请求体**:
```json
{
  "name": "高配",
  "color": "#10b981",
  "description": "高性能服务器"
}
```

---

### 4.4 更新标签
```
PUT /api/tags/:id
```

---

### 4.5 删除标签
```
DELETE /api/tags/:id
```

---

## 5. 用户管理 `/users`

### 5.1 用户登录
```
POST /api/users/login
```

**请求体**:
```json
{
  "username": "admin",
  "password": "admin"
}
```

**响应**:
```json
{
  "token": "base64编码的token",
  "user": {
    "id": 1,
    "username": "admin",
    "display_name": "管理员",
    "role": "admin"
  }
}
```

---

### 5.2 获取当前用户
```
GET /api/users/me
```

**请求头**: `Authorization: Bearer <token>`

---

### 5.3 获取用户列表
```
GET /api/users
```

---

### 5.4 创建用户
```
POST /api/users
```

**请求体**:
```json
{
  "username": "newuser",
  "password": "Password123!",
  "display_name": "新用户",
  "role": "operator"
}
```

---

### 5.5 更新用户
```
PUT /api/users/:id
```

---

### 5.6 删除用户
```
DELETE /api/users/:id
```

---

### 5.7 修改密码
```
POST /api/users/:id/change-password
```

**请求体**:
```json
{
  "oldPassword": "旧密码",
  "newPassword": "新密码(至少8位，包含大小写字母、数字、特殊字符)"
}
```

---

## 6. 成本统计 `/cost`

### 6.1 获取成本总览
```
GET /api/cost/overview
```

**响应**:
```json
{
  "summary": {
    "deviceCost": {
      "totalServers": 100,
      "serversWithPrice": 80,
      "totalPurchasePrice": 5000000,
      "totalResidualValue": 3000000,
      "totalDepreciatedValue": 2000000,
      "depreciationProgress": 40
    },
    "cabinetCost": {
      "totalCabinets": 10,
      "totalServers": 100,
      "annualFeePerCabinet": 4000,
      "totalAnnualFee": 40000
    },
    "totalCost": {
      "currentValue": 3040000,
      "totalInvested": 5040000
    }
  },
  "serverCostDetails": [...],
  "cabinetCosts": [...],
  "cabinetByEnv": [...]
}
```

**折旧规则**: 设备按4年平均折旧

---

### 6.2 获取单台设备成本详情
```
GET /api/cost/server/:id
```

---

### 6.3 获取机柜成本明细
```
GET /api/cost/cabinets
```

**Query 参数**: `environment` - 环境过滤

---

### 6.4 按环境统计成本
```
GET /api/cost/by-environment
```

---

## 7. 审计日志 `/audit-logs`

### 7.1 获取审计日志列表
```
GET /api/audit-logs
```

**Query 参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| username | string | 用户名 |
| action | string | 操作类型 |
| target_type | string | 目标类型 |
| start_date | string | 开始日期 (YYYY-MM-DD) |
| end_date | string | 结束日期 (YYYY-MM-DD) |
| keyword | string | 关键词 |
| page | number | 页码 (默认1) |
| page_size | number | 每页数量 (默认20) |

---

### 7.2 获取审计统计
```
GET /api/audit-logs/stats
```

---

### 7.3 获取操作类型列表
```
GET /api/audit-logs/actions
```

---

### 7.4 获取目标类型列表
```
GET /api/audit-logs/target-types
```

---

### 7.5 记录操作日志
```
POST /api/audit-logs
```

**请求体**:
```json
{
  "user_id": 1,
  "username": "admin",
  "action": "创建",
  "target": "服务器名称",
  "target_type": "服务器",
  "detail": "详细信息",
  "ip_address": "192.168.1.1"
}
```

---

## 8. 变更历史 `/change-logs`

### 8.1 获取变更历史
```
GET /api/change-logs
```

**Query 参数**: `server_id`, `change_type`, `start_date`, `end_date`, `keyword`

---

### 8.2 获取服务器变更历史
```
GET /api/change-logs/server/:serverId
```

---

### 8.3 获取变更统计
```
GET /api/change-logs/stats
```

---

## 9. 角色类型 `/role-types`

### 9.1 获取角色类型列表
```
GET /api/role-types
```

---

### 9.2 创建角色类型
```
POST /api/role-types
```

**请求体**:
```json
{
  "name": "compute",
  "display_name": "计算节点",
  "color": "#3B82F6",
  "icon": "Server",
  "sort_order": 1,
  "description": "计算服务器"
}
```

---

### 9.3 更新角色类型
```
PUT /api/role-types/:id
```

---

### 9.4 删除角色类型
```
DELETE /api/role-types/:id
```

---

### 9.5 获取按角色类型分组的角色
```
GET /api/role-types/grouped-roles
```

---

## 10. 自定义列 `/custom-columns`

### 10.1 获取自定义列配置
```
GET /api/custom-columns
```

**Query 参数**: `page_type` - 页面类型

---

### 10.2 创建自定义列
```
POST /api/custom-columns
```

**请求体**:
```json
{
  "page_type": "environments",
  "column_key": "custom_field",
  "column_label": "自定义字段",
  "column_type": "text",
  "options": ["选项1", "选项2"],
  "sort_order": 0,
  "visible": true,
  "width": 100,
  "editable": true,
  "required": false
}
```

---

### 10.3 更新自定义列
```
PUT /api/custom-columns/:id
```

---

### 10.4 删除自定义列
```
DELETE /api/custom-columns/:id
```

---

## 11. 版本管理 `/versions`

### 11.1 获取版本列表
```
GET /api/versions
```

**Query 参数**: `data_type`, `limit`, `offset`

---

### 11.2 获取最新版本号
```
GET /api/versions/latest
```

---

### 11.3 获取版本详情
```
GET /api/versions/:versionNumber
```

---

### 11.4 创建快照
```
POST /api/versions/snapshot
```

**请求体**:
```json
{
  "data_type": "all",
  "description": "版本描述",
  "operator": "admin"
}
```

---

### 11.5 回退版本
```
POST /api/versions/:versionNumber/rollback
```

---

### 11.6 比较版本差异
```
GET /api/versions/compare?from=1&to=2
```

---

## 12. 数据导入 `/import`

### 12.1 上传文件
```
POST /api/import/upload
```

**Content-Type**: `multipart/form-data`

**响应**:
```json
{
  "success": true,
  "filePath": "/path/to/file",
  "filename": "original.xlsx"
}
```

---

### 12.2 导入服务器数据
```
POST /api/import/import
```

**请求体**:
```json
{
  "filePath": "/path/to/file",
  "sheetIndex": 0
}
```

---

### 12.3 预览Excel
```
POST /api/import/preview
```

**请求体**:
```json
{
  "filePath": "/path/to/file"
}
```

**响应**:
```json
{
  "sheets": [{
    "name": "Sheet1",
    "totalRows": 100,
    "columns": ["系统IP", "品牌", "型号"],
    "sampleData": [...],
    "serverCount": 95
  }],
  "totalSheets": 1
}
```

---

### 12.4 删除上传文件
```
POST /api/import/cleanup
```

**请求体**:
```json
{
  "filePath": "/path/to/file"
}
```

---

## 13. 系统设置 `/settings`

### 13.1 获取所有设置
```
GET /api/settings
```

---

### 13.2 获取单个设置
```
GET /api/settings/:key
```

---

### 13.3 更新设置
```
PUT /api/settings/:key
```

**请求体**:
```json
{
  "value": "设置值"
}
```

---

### 13.4 导出数据
```
GET /api/settings/export
```

---

### 13.5 清空数据
```
DELETE /api/settings/clear
```

**请求体**:
```json
{
  "type": "servers" | "logs"
}
```

---

## 14. 健康检查

### 14.1 健康检查
```
GET /api/health
```

**响应**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 数据模型

### Server 服务器
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | 名称 |
| environment | TEXT | 环境 |
| system_ip | TEXT | 系统IP |
| manage_ip | TEXT | 管理IP |
| oob_ip | TEXT | 带外IP |
| mac_address | TEXT | MAC地址 |
| cabinet | TEXT | 机柜 |
| u_position | INTEGER | U位 |
| u_height | INTEGER | 高度 |
| sn | TEXT | 序列号 |
| brand | TEXT | 品牌 |
| model | TEXT | 型号 |
| cpu | TEXT | CPU |
| memory | TEXT | 内存 |
| disk | TEXT | 磁盘 |
| network_card | TEXT | 网卡 |
| role | TEXT | 角色 |
| role_type | TEXT | 角色类型 |
| tags | TEXT | 标签 |
| status | TEXT | 状态 |
| online_status | TEXT | 在线状态 |
| last_heartbeat | TEXT | 最后心跳 |
| remark | TEXT | 备注 |
| purchase_price | REAL | 采购价格 |
| purchase_date | TEXT | 采购日期 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

### Cabinet 机柜
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | 名称 |
| environment | TEXT | 环境 |
| total_u | INTEGER | 总U数 |
| reserved_u | TEXT | 预留U位 |
| remark | TEXT | 备注 |

### Environment 环境
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | 名称 |
| code | TEXT | 代码 |
| description | TEXT | 描述 |
| sort_order | INTEGER | 排序 |
| status | TEXT | 状态 |

### Tag 标签
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | 名称 |
| color | TEXT | 颜色 |
| description | TEXT | 描述 |

### User 用户
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| username | TEXT | 用户名 |
| password | TEXT | 密码(MD5) |
| display_name | TEXT | 显示名称 |
| role | TEXT | 角色 |
| status | TEXT | 状态 |
