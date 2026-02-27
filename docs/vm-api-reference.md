# 京东云VM API接口参考

本文档列出了京东云VM服务的完整API接口清单，并对比了当前CLI工具的实现状态。

## 📋 完整API接口清单

### 实例管理接口

| API接口 | 功能描述 | CLI实现状态 | 备注 |
|---------|----------|-------------|------|
| DescribeInstances | 查询云主机列表 | ✅ 已实现 | 支持过滤和分页 |
| DescribeInstanceStatus | 查询云主机状态 | ✅ 已实现 | 批量状态查询 |
| CreateInstances | 创建云主机 | ✅ 已实现 | 支持完整参数 |
| StartInstance | 启动云主机 | ✅ 已实现 | 基础功能 |
| StopInstance | 停止云主机 | ✅ 已实现 | 基础功能 |
| RebootInstance | 重启云主机 | ✅ 已实现 | 基础功能 |
| DeleteInstance | 删除云主机 | ✅ 已实现 | 基础功能 |
| ModifyInstanceAttribute | 修改云主机属性 | ✅ 已实现 | 名称、描述等 |
| DescribeInstanceTypes | 查询实例规格列表 | ✅ 已实现 | 规格信息查询 |

### 网络相关接口

| API接口 | 功能描述 | CLI实现状态 | 备注 |
|---------|----------|-------------|------|
| AssociateElasticIp | 绑定弹性公网IP | ✅ 已实现 | IP绑定 |
| DisassociateElasticIp | 解绑弹性公网IP | ✅ 已实现 | IP解绑 |
| DescribeInstanceVncUrl | 获取实例VNC地址 | ✅ 已实现 | 远程访问 |
| ModifyInstanceNetworkAttribute | 修改实例网络属性 | ❌ 未实现 | 网络配置修改 |
| AttachNetworkInterface | 挂载弹性网卡 | ❌ 未实现 | 网卡挂载 |
| DetachNetworkInterface | 卸载弹性网卡 | ❌ 未实现 | 网卡卸载 |

### 存储相关接口

| API接口 | 功能描述 | CLI实现状态 | 备注 |
|---------|----------|-------------|------|
| AttachDisk | 挂载云硬盘 | ❌ 未实现 | 数据盘挂载 |
| DetachDisk | 卸载云硬盘 | ❌ 未实现 | 数据盘卸载 |
| DescribeInstanceDisks | 查询实例磁盘信息 | ❌ 未实现 | 磁盘信息查询 |

### 镜像相关接口

| API接口 | 功能描述 | CLI实现状态 | 备注 |
|---------|----------|-------------|------|
| DescribeImages | 查询镜像列表 | ❌ 未实现 | 镜像查询 |
| CreateImage | 创建自定义镜像 | ❌ 未实现 | 镜像创建 |
| DeleteImage | 删除自定义镜像 | ❌ 未实现 | 镜像删除 |
| ShareImage | 共享镜像 | ❌ 未实现 | 镜像共享 |

### 安全相关接口

| API接口 | 功能描述 | CLI实现状态 | 备注 |
|---------|----------|-------------|------|
| DescribeSecurityGroups | 查询安全组列表 | ❌ 未实现 | 安全组查询 |
| CreateSecurityGroup | 创建安全组 | ❌ 未实现 | 安全组创建 |
| DeleteSecurityGroup | 删除安全组 | ❌ 未实现 | 安全组删除 |
| AuthorizeSecurityGroup | 添加安全组规则 | ❌ 未实现 | 规则添加 |
| RevokeSecurityGroup | 删除安全组规则 | ❌ 未实现 | 规则删除 |

### 密钥相关接口

| API接口 | 功能描述 | CLI实现状态 | 备注 |
|---------|----------|-------------|------|
| DescribeKeypairs | 查询密钥对列表 | ❌ 未实现 | 密钥查询 |
| CreateKeypair | 创建密钥对 | ❌ 未实现 | 密钥创建 |
| DeleteKeypair | 删除密钥对 | ❌ 未实现 | 密钥删除 |
| ImportKeypair | 导入密钥对 | ❌ 未实现 | 密钥导入 |

### 监控相关接口

| API接口 | 功能描述 | CLI实现状态 | 备注 |
|---------|----------|-------------|------|
| DescribeInstanceMonitorInfo | 查询实例监控信息 | ❌ 未实现 | 性能监控 |
| DescribeInstanceMetrics | 查询实例指标 | ❌ 未实现 | 指标查询 |

### 配额相关接口

| API接口 | 功能描述 | CLI实现状态 | 备注 |
|---------|----------|-------------|------|
| DescribeQuotas | 查询配额信息 | ✅ 已实现 | 资源配额查询 |

### 实例模板相关接口

| API接口 | 功能描述 | CLI实现状态 | 备注 |
|---------|----------|-------------|------|
| DescribeInstanceTemplates | 查询实例模板 | ❌ 未实现 | 模板查询 |
| CreateInstanceTemplate | 创建实例模板 | ❌ 未实现 | 模板创建 |
| DeleteInstanceTemplate | 删除实例模板 | ❌ 未实现 | 模板删除 |

## 📊 实现状态统计

| 状态 | 数量 | 百分比 |
|------|------|--------|
| ✅ 已实现 | 12 | 35% |
| ❌ 未实现 | 22 | 65% |
| **总计** | **34** | **100%** |

## 🎯 优先级建议

### 高优先级（建议立即实现）
1. **AttachDisk/DetachDisk** - 存储管理核心功能
2. **DescribeImages** - 镜像选择基础功能
3. **DescribeSecurityGroups** - 安全组管理基础功能
4. **DescribeKeypairs** - 密钥管理基础功能

### 中优先级（建议后续实现）
1. **ModifyInstanceNetworkAttribute** - 网络配置修改
2. **AttachNetworkInterface/DetachNetworkInterface** - 弹性网卡管理
3. **DescribeInstanceMonitorInfo** - 监控信息查询
4. **CreateImage/DeleteImage** - 镜像管理

### 低优先级（可暂缓实现）
1. **ShareImage** - 镜像共享
2. **Create/Delete SecurityGroup** - 安全组管理
3. **Instance Template 相关接口** - 实例模板管理
4. **Advanced Metrics** - 高级监控指标

## 📝 当前CLI命令清单

### 基础命令
- `describe-instances` - 查询实例列表
- `create-instance` - 创建实例
- `start-instance` - 启动实例
- `stop-instance` - 停止实例
- `reboot-instance` - 重启实例
- `delete-instance` - 删除实例

### 扩展命令
- `describe-instance-status` - 查询实例状态
- `describe-instance-types` - 查询实例规格
- `modify-instance-attribute` - 修改实例属性
- `associate-elastic-ip` - 绑定弹性IP
- `disassociate-elastic-ip` - 解绑弹性IP
- `describe-instance-vnc-url` - 查询VNC地址
- `describe-quotas` - 查询配额信息

## 🔧 下一步计划

1. **实现存储相关接口** - AttachDisk/DetachDisk
2. **实现镜像相关接口** - DescribeImages
3. **实现安全组相关接口** - DescribeSecurityGroups
4. **实现密钥对管理接口** - DescribeKeypairs
5. **完善监控接口** - 性能监控查询