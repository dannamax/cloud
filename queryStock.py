from futu import OpenQuoteContext, RET_OK
from datetime import datetime
import json
import argparse
import sys

# Exchange rate configuration
HKD_TO_CNY = 0.92  # 1 HKD = 0.92 CNY

def get_single_stock_info(quote_ctx, stock_code, hold_num=440):
    ret, data = quote_ctx.get_market_snapshot([stock_code])
    if ret != RET_OK or data.empty:
        print(f"Warning: Failed to get data for {stock_code}")
        return None
    
    stock_data = data.iloc[0]
    prev_close = stock_data['prev_close_price']
    last_price = stock_data['last_price']
    high_price = stock_data['high_price']
    low_price = stock_data['low_price']
    
    change_rate = (last_price - prev_close) / prev_close * 100 if prev_close != 0 else 0
    intraday_max_increase = (high_price - prev_close) / prev_close * 100 if prev_close != 0 else 0
    intraday_max_decrease = (low_price - prev_close) / prev_close * 100 if prev_close != 0 else 0
    total_hkd = hold_num * last_price
    total_cny = total_hkd * HKD_TO_CNY

    return {
        "Code": stock_code,
        "Name": stock_data['name'],
        "Latest": round(last_price, 2),
        "Change": round(change_rate, 2),
        "MaxInc": round(intraday_max_increase, 2),
        "MaxDec": round(intraday_max_decrease, 2),
        "ValHKD": round(total_hkd, 2),
        "ValCNY": round(total_cny, 2),
        "Open": round(stock_data['open_price'], 2),
        "PrevClose": round(prev_close, 2),
        "High": round(high_price, 2),
        "Low": round(low_price, 2),
        "UpdateTime": stock_data['update_time'],
        "RawData": stock_data.to_dict()
    }

def get_multi_stock_info(stock_codes, hold_num=440):
    quote_ctx = OpenQuoteContext(host='127.0.0.1', port=11111)
    stock_list = []

    try:
        for code in stock_codes:
            processed_code = code if "." in code else f"HK.{code}"
            stock_info = get_single_stock_info(quote_ctx, processed_code, hold_num)
            if stock_info:
                stock_list.append(stock_info)

        # Step 1: Raw Data (Single-Line JSON)
        print("=== Raw Data (Single-Line JSON Format) ===")
        for stock in stock_list:
            single_line_json = json.dumps(stock["RawData"], ensure_ascii=False, separators=(',', ':'))
            print(f"{stock['Code']}: {single_line_json}")

        # Step 2: Core Stock Info Table (匹配目标格式)
        print("\n=== Core Stock Info & Position Value ===")
        # 表头
        print(f"Code{' '*(8)} | Name{' '*(10)} | Latest(HKD){' '*(8)} | Change(%){' '*(4)} | MaxInc(%){' '*(4)} | MaxDec(%){' '*(4)} | Value(HKD){' '*(4)} | Value(CNY)")
        # 分隔线
        print("-"*120)
        # 数据行（按目标格式左对齐+固定空格填充）
        for stock in stock_list:
            print(f"{stock['Code']:<10} | {stock['Name']:<12} | {str(stock['Latest']):>12} | {str(stock['Change']):>10} | {str(stock['MaxInc']):>10} | {str(stock['MaxDec']):>10} | {str(stock['ValHKD']):>10} | {str(stock['ValCNY']):>10}")

        # Step 3: Stock Detail Data Table (匹配目标格式)
        print("\n=== Stock Detail Data ===")
        # 表头
        print(f"Code{' '*(8)} | Open(HKD){' '*(6)} | PrevClose(HKD){' '*(4)} | High(HKD){' '*(8)} | Low(HKD){' '*(8)} | UpdateTime")
        # 分隔线
        print("-"*120)
        # 数据行
        for stock in stock_list:
            print(f"{stock['Code']:<10} | {str(stock['Open']):>12} | {str(stock['PrevClose']):>15} | {str(stock['High']):>12} | {str(stock['Low']):>12} | {stock['UpdateTime']}")

    finally:
        quote_ctx.close()

def main():
    print("Example: python3 queryStock.py --names 09988 00700 00100 --type HK --num 440")
    
    parser = argparse.ArgumentParser(description="Query multiple stocks (matched format)")
    parser.add_argument("--names", nargs="+", required=True, help="Multiple stock codes (e.g., 09988 00700 00100)")
    parser.add_argument("--type", required=True, help="Market type (HK/US)")
    parser.add_argument("--num", type=int, default=440, help="Shares per stock (default 440)")
    args = parser.parse_args()

    if args.type.upper() != "HK" and any("." not in code for code in args.names):
        print("Error: Simplified codes (without .) only supported for HK market. Use full codes (e.g., AAPL.US) for US.")
        sys.exit(1)

    get_multi_stock_info(args.names, args.num)

if __name__ == "__main__":
    main()
