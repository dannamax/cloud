from futu import OpenQuoteContext, RET_OK
import argparse
import sys
import json  # 新增JSON模块

# 核心配置参数
HKD_TO_CNY = 0.92
TOTAL_SHARES = 3500
LEVERAGE_RATIO = 2.9404
FIXED_COST_PER_SHARE = 159.631

def truncate_str(s, max_width=10):
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
    ret, data = quote_ctx.get_market_snapshot([stock_code])
    if ret != RET_OK or data.empty:
        print(f"Warning: 无法获取{stock_code}的数据")
        return None
    
    stock = data.iloc[0]
    prev_close = stock['prev_close_price']
    last_price = stock['last_price']
    
    # 计算逻辑（保持不变）
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

    # 整理为字典（用于表格+JSON输出）
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

def generate_uniform_width_table(data_list):
    """生成表格输出（保持原对齐逻辑）"""
    core_columns = [
        "Code", "Name", "Cost(HKD)", "Latest(HKD)", "Change(%)"
    ]
    col_width = 10
    header_template = []
    for col in core_columns:
        if col in ["Code", "Name"]:
            header_template.append(f"{{:<{col_width}}}")
        else:
            header_template.append(f"{{:>{col_width}}}")
    header_template = " | ".join(header_template)
    
    header = header_template.format(*core_columns)
    separator = " | ".join(["-"*col_width for _ in core_columns])
    rows = []
    for item in data_list:
        row_data = [
            item["basic"]["Code"],
            truncate_str(item["basic"]["Name"], 10),
            str(item["price"]["CostPerShare(HKD)"]),
            str(item["price"]["Latest(HKD)"]),
            str(item["price"]["Change(%)"]),
            str(item["calculation"]["TotalCost(HKD)"]),
            str(item["calculation"]["TotalCost(CNY)"]),
            str(item["calculation"]["TotalValue(HKD)"]),
            str(item["calculation"]["TotalValue(CNY)"]),
            str(item["calculation"]["BaseProfit(HKD)"]),
            str(item["calculation"]["LeverProfit(HKD)"]),
            str(item["calculation"]["LeverProfit(CNY)"]),
            str(item["calculation"]["ProfitRate(%)"])
        ]
        rows.append(header_template.format(*row_data))
    
    return "\n".join([header, separator] + rows)

def main():
    print(f"=== 核心计算参数 ===")
    print(f"每股成本价：{FIXED_COST_PER_SHARE} HKD")
    print(f"总计持股数量：{TOTAL_SHARES} 股")
    print(f"杠杆比例：{LEVERAGE_RATIO*100}%")
    print(f"港币兑人民币汇率：{HKD_TO_CNY}\n")
    
    parser = argparse.ArgumentParser(description="多股票查询（含成本、收益、杠杆计算+JSON输出）")
    parser.add_argument("--names", nargs="+", required=True, help="股票代码列表（如09988 00700）")
    parser.add_argument("--type", required=True, help="市场类型（HK/US）")
    # 新增参数：是否输出JSON（默认同时输出表格+JSON）
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
    print(json.dumps(json_result, ensure_ascii=False, indent=2))  # 格式化输出JSON

    # 输出表格（若未指定--json-only）
    if not args.json_only:
        print("\n=== Core Stock Info & Profit Calculation ===")
        print(generate_uniform_width_table(data_list))

        print("\n=== Stock Detail Data ===")
        detail_columns = ["Code", "Open(HKD)", "PrevClose(HKD)", "High(HKD)", "Low(HKD)", "UpdateTime"]
        col_width = 10
        detail_header_template = []
        for col in detail_columns:
            if col == "UpdateTime":
                detail_header_template.append(f"{{:<{col_width}}}")
            else:
                detail_header_template.append(f"{{:>{col_width}}}")
        detail_header_template = " | ".join(detail_header_template)
        print(detail_header_template.format(*detail_columns))
        print(" | ".join(["-"*col_width for _ in detail_columns]))
        for item in data_list:
            detail_row = [
                item["basic"]["Code"],
                str(item["price"]["Open(HKD)"]),
                str(item["price"]["PrevClose(HKD)"]),
                str(item["price"]["High(HKD)"]),
                str(item["price"]["Low(HKD)"]),
                truncate_str(item["basic"]["UpdateTime"], 10)
            ]
            print(detail_header_template.format(*detail_row))

if __name__ == "__main__":
    main()
