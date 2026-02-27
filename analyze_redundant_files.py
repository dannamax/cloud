#!/usr/bin/env python3
"""
分析futu目录下的冗余文件
识别重复文件和可以安全删除的文件
"""

import os
import hashlib
import json
from datetime import datetime
from pathlib import Path

def calculate_file_hash(file_path):
    """计算文件的MD5哈希值"""
    try:
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    except Exception as e:
        print(f"计算哈希值时出错 {file_path}: {e}")
        return None

def get_file_info(file_path):
    """获取文件信息"""
    try:
        stat = os.stat(file_path)
        return {
            "path": str(file_path),
            "size": stat.st_size,
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "hash": calculate_file_hash(file_path)
        }
    except Exception as e:
        print(f"获取文件信息时出错 {file_path}: {e}")
        return None

def scan_directory(directory):
    """扫描目录并收集文件信息"""
    files_info = []
    duplicates = {}
    
    for root, dirs, files in os.walk(directory):
        # 跳过一些不需要扫描的目录
        skip_dirs = ['.git', '__pycache__', '.DS_Store']
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        
        for file in files:
            file_path = Path(root) / file
            if file.startswith('.') or file == 'Thumbs.db':
                continue
                
            file_info = get_file_info(file_path)
            if file_info:
                files_info.append(file_info)
                
                # 检查重复文件
                file_hash = file_info["hash"]
                if file_hash:
                    if file_hash in duplicates:
                        duplicates[file_hash].append(file_info)
                    else:
                        duplicates[file_hash] = [file_info]
    
    return files_info, duplicates

def analyze_redundant_files(base_dir):
    """分析冗余文件"""
    print(f"正在分析目录: {base_dir}")
    
    files_info, duplicates = scan_directory(base_dir)
    
    # 找出真正的重复文件（同一个哈希值有多个文件）
    true_duplicates = {k: v for k, v in duplicates.items() if len(v) > 1}
    
    # 按文件类型分类
    file_types = {}
    large_files = []
    
    for file_info in files_info:
        file_path = Path(file_info["path"])
        file_ext = file_path.suffix.lower()
        file_size = file_info["size"]
        
        if file_ext not in file_types:
            file_types[file_ext] = []
        file_types[file_ext].append(file_info)
        
        # 记录大文件（大于10MB）
        if file_size > 10 * 1024 * 1024:
            large_files.append(file_info)
    
    # 生成报告
    report = {
        "scan_time": datetime.now().isoformat(),
        "total_files": len(files_info),
        "total_size": sum(f["size"] for f in files_info),
        "duplicate_groups": len(true_duplicates),
        "duplicate_files": sum(len(group) for group in true_duplicates.values()),
        "large_files": len(large_files),
        "file_types": {k: len(v) for k, v in file_types.items()},
        "duplicates": true_duplicates,
        "large_files": large_files,
        "file_types_detail": file_types
    }
    
    return report

def generate_cleanup_suggestions(report):
    """生成清理建议"""
    suggestions = []
    
    # 建议删除重复文件
    for hash_value, files in report["duplicates"].items():
        if len(files) > 1:
            # 保留一个，删除其余的
            keep_file = files[0]  # 保留第一个
            for i in range(1, len(files)):
                suggestions.append({
                    "action": "delete",
                    "file": files[i]["path"],
                    "reason": f"重复文件，保留 {keep_file['path']}",
                    "size_saved": files[i]["size"]
                })
    
    # 建议删除大型DMG文件（如果已安装）
    for file in report["large_files"]:
        if file["path"].endswith(".dmg") and "Futu_OpenD" in file["path"]:
            suggestions.append({
                "action": "delete",
                "file": file["path"],
                "reason": "大型安装包，如已安装可删除",
                "size_saved": file["size"]
            })
    
    # 建议删除临时文件
    temp_patterns = [".tmp", ".temp", ".cache", ".log"]
    for ext, files in report["file_types_detail"].items():
        for file_info in files:
            for pattern in temp_patterns:
                if pattern in file_info["path"].lower():
                    suggestions.append({
                        "action": "delete",
                        "file": file_info["path"],
                        "reason": "临时文件",
                        "size_saved": file_info["size"]
                    })
    
    return suggestions

def main():
    base_dir = Path("/Users/songheng/Documents/项目文件/代码项目/futu")
    
    if not base_dir.exists():
        print(f"目录不存在: {base_dir}")
        return
    
    # 分析冗余文件
    report = analyze_redundant_files(base_dir)
    
    # 生成清理建议
    suggestions = generate_cleanup_suggestions(report)
    
    # 保存报告
    report_file = base_dir / "redundant_files_report.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    # 保存建议
    suggestions_file = base_dir / "cleanup_suggestions.json"
    with open(suggestions_file, "w", encoding="utf-8") as f:
        json.dump(suggestions, f, indent=2, ensure_ascii=False)
    
    # 打印摘要
    print("\n" + "="*60)
    print("冗余文件分析报告")
    print("="*60)
    print(f"扫描时间: {report['scan_time']}")
    print(f"总文件数: {report['total_files']}")
    print(f"总大小: {report['total_size'] / (1024*1024):.2f} MB")
    print(f"重复文件组: {report['duplicate_groups']}")
    print(f"重复文件数: {report['duplicate_files']}")
    print(f"大文件数: {report['large_files']}")
    
    print("\n文件类型统计:")
    for ext, count in sorted(report["file_types"].items(), key=lambda x: x[1], reverse=True):
        print(f"  {ext}: {count} 个文件")
    
    print(f"\n清理建议 ({len(suggestions)} 项):")
    total_space_saved = 0
    for i, suggestion in enumerate(suggestions[:10], 1):  # 只显示前10个
        print(f"{i}. {suggestion['action']} {suggestion['file']}")
        print(f"   原因: {suggestion['reason']}")
        print(f"   可节省空间: {suggestion['size_saved'] / (1024*1024):.2f} MB")
        total_space_saved += suggestion["size_saved"]
    
    if len(suggestions) > 10:
        print(f"... 还有 {len(suggestions) - 10} 项建议")
    
    print(f"\n预计总共可节省空间: {total_space_saved / (1024*1024):.2f} MB")
    
    print(f"\n详细报告已保存到: {report_file}")
    print(f"清理建议已保存到: {suggestions_file}")

if __name__ == "__main__":
    main()