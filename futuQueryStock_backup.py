from futu import OpenQuoteContext, RET_OK
from datetime import datetime
import json
import argparse
import sys

# Exchange rate configuration (adjust according to real-time exchange rate, using common mid-rate here)
HKD_TO_CNY = 0.92  # 1 Hong Kong Dollar = 0.92 Chinese Yuan

def get_stock_info(stock_code, hold_num=440):
    """
    Get stock information and calculate position value
    :param stock_code: Stock code (e.g., HK.00100)
    :param hold_num: Number of shares held, default is 440 shares
    """
    quote_ctx = OpenQuoteContext(host='127.0.0.1', port=11111)
    try:
        # 1. Get stock market snapshot data
        ret, data = quote_ctx.get_market_snapshot([stock_code])
        if ret != RET_OK:
            print(f"Failed to get market data: {data}")
            return
        
        if data is not None and not data.empty:
            stock_data = data.iloc[0]
            # Output all fields in JSON format
            all_fields_dict = stock_data.to_dict()
            print("=== All Fields (JSON Format) ===")
            print(json.dumps(all_fields_dict, ensure_ascii=False, indent=None))
            
            # 2. Extract core market data fields
            last_price = stock_data['last_price']  # Latest price (HKD)
            prev_close = stock_data['prev_close_price']
            open_price = stock_data['open_price']
            high_price = stock_data['high_price']
            low_price = stock_data['low_price']
            
            # Calculate basic change rate
            change_rate = (last_price - prev_close) / prev_close * 100 if prev_close != 0 else 0
            
            # 3. Calculate intraday maximum increase/decrease (based on previous close price)
            # Intraday max increase rate = (highest price - previous close) / previous close * 100
            intraday_max_increase = (high_price - prev_close) / prev_close * 100 if prev_close != 0 else 0
            # Intraday max decrease rate = (lowest price - previous close) / previous close * 100
            intraday_max_decrease = (low_price - prev_close) / prev_close * 100 if prev_close != 0 else 0
            
            # 4. Calculate position value
            total_value_hkd = hold_num * last_price  # Total value in HKD
            total_value_cny = total_value_hkd * HKD_TO_CNY  # Total value in CNY
            
            # 5. Format and output results
            #print(f"\n===== {stock_data['code']} ({stock_data['name']}) Market Data & Position Value =====")
            print(f"\n===== {stock_data['code']} Market Data & Position Value =====")
            print(f"Latest Price: {last_price} HKD")
            print(f"Price Change (%): {round(change_rate, 2)}")
            print(f"Open Price: {open_price} HKD")
            print(f"Previous Close Price: {prev_close} HKD")
            print(f"Highest Price: {high_price} HKD")
            print(f"Lowest Price: {low_price} HKD")
            # New: Intraday max increase/decrease
            print(f"Intraday Maximum Increase (%): {round(intraday_max_increase, 2)}")
            print(f"Intraday Maximum Decrease (%): {round(intraday_max_decrease, 2)}")
            print(f"Update Time: {stock_data['update_time']}")
            
            print(f"\n===== Position Value Calculation ({hold_num} Shares) =====")
            print(f"Total Value (HKD): {round(total_value_hkd, 2)} HKD")
            print(f"Total Value (CNY): {round(total_value_cny, 2)} CNY (Exchange Rate: 1 HKD = {HKD_TO_CNY} CNY)")

    finally:
        # Close the connection to avoid resource leakage
        quote_ctx.close()

def main():
    # Show command line usage example first
    print("Example: python3 futuQueryStock.py --name 09988 --type HK --num 440")
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Query stock market data and calculate position value (default 440 shares)")
    parser.add_argument("--name", required=True, help="Stock code (e.g., 09988) or full code (e.g., HK.09988)")
    parser.add_argument("--type", required=True, help="Market type, optional values: HK/US")
    # Optional parameter: support custom number of shares (default 440)
    parser.add_argument("--num", type=int, default=440, help="Number of shares held, default is 440")
    args = parser.parse_args()

    # Process stock code format (compatible with simplified input)
    if "." in args.name:
        stock_code = args.name
    else:
        # Splice complete code
        if args.type.upper() == "HK":
            stock_code = f"HK.{args.name}"
        elif args.type.upper() == "US":
            stock_code = f"US.{args.name}"
        else:
            stock_code = args.name

    # Call the query function
    get_stock_info(stock_code, args.num)

if __name__ == "__main__":
    main()
