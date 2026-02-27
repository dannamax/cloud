#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
优化版股票查询脚本 - 表格对齐输出
"""

from futu import OpenQuoteContext, RET_OK
import argparse
import sys
import json

# 核心配置参数
HKD_TO_CNY = 0.92
TOTAL_SHARES = 3500
LEVERAGE_RATIO = 2.9404
FIXED_COST_PER_SHARE = 159.631

def truncate_str(s, max_width=10):
    """智能截断字符串，考虑中文字符宽度"""
    width = 0
    result = []
    for c in s:
        char_width = 2 if '\u4e00' <= c <= '\u9fff' else 1
        if width + char_width > max_width:
            result.append("...")
            break
        result.append(c)
        width += char_width
    return "".join(result)

def get_single_stock_data(quote_ctx, stock_code):
    """获取单只股票数据"""
    ret, data = quote_ctx.get_market_snapshot([stock_code])
    if ret != RET_OK or data.empty:
        print(f"Warning: 无法获取{stock_code}的数据")
        return None
    
    stock = data.iloc[0]
    prev_close = stock['prev_close_price']
    last_price = stock['last_price']
    
    # 计算逻辑
    change_rate = round((last_price - prev_close)/prev_close*100 if prev_close else 0, 2)
    intraday_max_increase = round((stock['high_price'] - prev_close)/prev_close*100 if prev_close else 0, 2)
    intraday_max_decrease = round((stock['low_price'] - prev_close)/prev_close*100 if prev_close else 0, 2)
    total_cost_hkd = round(FIXED_COST_PER_SHARE * TOTAL_SHARES, 2)
    total_cost_cny = round(total_cost_hkd * HKD_TO_CNY, 2)
    total_value_hkd = round(last_price * TOTAL_SHARES, 2)
    total_value_cny = round(total_value_hkd * HKD_TO_CNY, 2)
    base_profit_hkd = round(total_value_hkd - total_cost_hkd, 2)
    leverage_profit_hkd = round(base_profit_hkd * LEVERAGE_RATIO, 2)
    leverage_profit_cny = round(leverage_profit_hkd * HKD_TO_CNY, 2)
    profit_rate = round((leverage_profit_hkd / total_cost_hkd) * 100 if total_cost_hkd else 0, 2)

    return {
        "basic": {
            "Code": str(stock['code']),
            "Name": str(stock['name']),
            "UpdateTime": str(stock['update_time'])
        },
        "price": {
            "CostPerShare(HKD)": FIXED_COST_PER_SHARE,
            "Latest(HKD)": round(last_price, 2),
            "Open(HKD)": round(stock['open_price'], 2),
            "PrevClose(HKD)": round(prev_close, 2),
            "High(HKD)": round(stock['high_price'], 2),
            "Low(HKD)": round(stock['low_price'], 2),
            "Change(%)": change_rate,
            "MaxInc(%)": intraday_max_increase,
            "MaxDec(%)": intraday_max_decrease
        },
        "calculation": {
            "TotalShares": TOTAL_SHARES,
            "LeverageRatio(%)": LEVERAGE_RATIO * 100,
            "TotalCost(HKD)": total_cost_hkd,
            "TotalCost(CNY)": total_cost_cny,
            "TotalValue(HKD)": total_value_hkd,
            "TotalValue(CNY)": total_value_cny,
            "BaseProfit(HKD)": base_profit_hkd,
            "LeverProfit(HKD)": leverage_profit_hkd,
            "LeverProfit(CNY)": leverage_profit_cny,
            "ProfitRate(%)": profit_rate
        }
    }

def create_aligned_table(data_list, columns_config):
    """创建对齐的表格输出"""
    if not data_list:
        return "No data available"
    
    # 计算每列的实际宽度
    col_widths = []
    for name, keys, align, min_width in columns_config:
        max_width = min_width
        # 检查每行数据的最大宽度
        for item in data_list:
            value = item
            for key in keys:
                value = value[key]
            str_value = str(value)
            # 处理中文字符宽度
            char_width = sum(2 if '\u4e00' <= c <= '\u9fff' else 1 for c in str_value)
            max_width = max(max_width, char_width)
        col_widths.append(max_width)
    
    # 生成表头
    header_parts = []
    for i, (name, _, align, _) in enumerate(columns_config):
        if align == "left":
            header_parts.append(f"{name:<{col_widths[i]}}")
        else:
            header_parts.append(f"{name:>{col_widths[i]}}")
    header = " | ".join(header_parts)
    
    # 生成分隔符
    separator_parts = []
    for width in col_widths:
        separator_parts.append("-" * width)
    separator = " | ".join(separator_parts)
    
    # 生成数据行
    rows = []
    for item in data_list:
        row_parts = []
        for i, (_, keys, align, _) in enumerate(columns_config):
            value = item
            for key in keys:
                value = value[key]
            str_value = str(value)
            
            # 处理名称截断
            if keys == ["basic", "Name"]:
                str_value = truncate_str(str_value, col_widths[i])
            
            if align == "left":
                row_parts.append(f"{str_value:<{col_widths[i]}}")
            else:
                row_parts.append(f"{str_value:>{col_widths[i]}}")
        
        rows.append(" | ".join(row_parts))
    
    return "\n".join([header, separator] + rows)

def main():
    print(f"=== 核心计算参数 ===")
    print(f"每股成本价：{FIXED_COST_PER_SHARE} HKD")
    print(f"总计持股数量：{TOTAL_SHARES} 股")
    print(f"杠杆比例：{LEVERAGE_RATIO*100}%")
    print(f"港币兑人民币汇率：{HKD_TO_CNY}\n")
    
    parser = argparse.ArgumentParser(description="优化版股票查询脚本 - 表格对齐输出")
    parser.add_argument("--names", nargs="+", required=True, help="股票代码列表（如09988 00700）")
    parser.add_argument("--type", required=True, help="市场类型（HK/US）")
    parser.add_argument("--json-only", action="store_true", help="仅输出JSON格式（不输出表格）")
    args = parser.parse_args()

    # 处理股票代码
    stock_codes = []
    for code in args.names:
        if "." in code:
            stock_codes.append(code)
        else:
            if args.type.upper() == "HK":
                stock_codes.append(f"HK.{code}")
            else:
                print(f"Error: US市场请传入完整代码（如AAPL.US）")
                sys.exit(1)

    # 获取数据
    quote_ctx = OpenQuoteContext(host='127.0.0.1', port=11111)
    data_list = []
    try:
        for code in stock_codes:
            stock_data = get_single_stock_data(quote_ctx, code)
            if stock_data:
                data_list.append(stock_data)
    finally:
        quote_ctx.close()

    # 输出JSON格式
    print("\n=== 数据结果（JSON格式） ===")
    json_result = {
        "parameters": {
            "CostPerShare(HKD)": FIXED_COST_PER_SHARE,
            "TotalShares": TOTAL_SHARES,
            "LeverageRatio(%)": LEVERAGE_RATIO * 100,
            "HKD_TO_CNY": HKD_TO_CNY
        },
        "stocks": data_list
    }
    print(json.dumps(json_result, ensure_ascii=False, indent=2))

    # 输出表格（若未指定--json-only）
    if not args.json_only:
        # 核心信息表格
        core_columns = [
            ("Code", ["basic", "Code"], "left", 8),
            ("Name", ["basic", "Name"], "left", 12),
            ("Cost(HKD)", ["price", "CostPerShare(HKD)"], "right", 10),
            ("Latest(HKD)", ["price", "Latest(HKD)"], "right", 10),
            ("Change(%)", ["price", "Change(%)"], "right", 8),
            ("TotalCost(HKD)", ["calculation", "TotalCost(HKD)"], "right", 12),
            ("TotalCost(CNY)", ["calculation", "TotalCost(CNY)"], "right", 12),
            ("TotalValue(HKD)", ["calculation", "TotalValue(HKD)"], "right", 13),
            ("TotalValue(CNY)", ["calculation", "TotalValue(CNY)"], "right", 13),
            ("BaseProfit(HKD)", ["calculation", "BaseProfit(HKD)"], "right", 12),
            ("LeverProfit(HKD)", ["calculation", "LeverProfit(HKD)"], "right", 13),
            ("LeverProfit(CNY)", ["calculation", "LeverProfit(CNY)"], "right", 13),
            ("ProfitRate(%)", ["calculation", "ProfitRate(%)"], "right", 11)
        ]
        
        print("\n=== 核心股票信息 & 收益计算 ===")
        print(create_aligned_table(data_list, core_columns))

        # 详情数据表格
        detail_columns = [
            ("Code", ["basic", "Code"], "left", 8),
            ("Open(HKD)", ["price", "Open(HKD)"], "right", 10),
            ("PrevClose(HKD)", ["price", "PrevClose(HKD)"], "right", 12),
            ("High(HKD)", ["price", "High(HKD)"], "right", 10),
            ("Low(HKD)", ["price", "Low(HKD)"], "right", 10),
            ("MaxInc(%)", ["price", "MaxInc(%)"], "right", 8),
            ("MaxDec(%)", ["price", "MaxDec(%)"], "right", 8),
            ("UpdateTime", ["basic", "UpdateTime"], "left", 15)
        ]
        
        print("\n=== 股票详情数据 ===")
        print(create_aligned_table(data_list, detail_columns))

if __name__ == "__main__":
    main()