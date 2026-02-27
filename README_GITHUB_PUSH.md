# GitHub推送说明

## 推送内容

由于原始futu目录包含大量大型二进制文件（总计约609MB），包括：
- Futu_OpenD应用程序（~95MB DMG文件）
- 应用程序数据文件（~13MB AppData.dat）
- 多个.framework框架文件
- 其他大型二进制资源

## 实际推送内容

本次推送包含了futu目录的核心源代码文件，总计约2.1MB，包括：

### Python脚本文件
- `futuQueryStock.py` - 主要港股查询工具
- `1.py` - 基础查询脚本
- `queryStock.py` - 查询脚本
- `queryStock_optimized.py` - 优化版查询脚本
- `smart_stock_monitor.py` - 智能股票监控
- `stock_monitor_cli.py` - CLI版股票监控
- `stock_monitor_with_charts.py` - 带图表的股票监控
- `simple_stock_chart.py` - 简单股票图表
- `text_stock_chart.py` - 文本股票图表
- `analyze_redundant_files.py` - 冗余文件分析
- `check_permissions.py` - 权限检查

### 核心库文件
- `common/` - 完整的Futu OpenAPI Python SDK
- `common/pb/` - 所有Protocol Buffer定义文件
- `__init__.py` - 包初始化文件

### 文档文件
- `README.md` - 项目说明文档
- `VERSION.txt` - 版本信息
- `OPTIMIZATION_SUMMARY.md` - 优化总结

## 大型文件处理

大型二进制文件（如Futu_OpenD应用程序）由于GitHub推送限制（HTTP 400错误）未被包含。如需这些文件，可以：

1. 从原始futu目录中获取
2. 从Futu官方网站下载最新版本
3. 使用其他方式分享（如云存储）

## 使用方法

```bash
# 克隆仓库
git clone https://github.com/dannamax/cloud.git
cd cloud
git checkout stockQuery

# 安装依赖
pip install futu-api

# 运行示例
python3 futuQueryStock.py --name 00700 --type HK --num 100
```

## 分支说明

- `stockQuery`分支：包含完整的futu核心源代码
- `main`分支：原始cloud项目内容