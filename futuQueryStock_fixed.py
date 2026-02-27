from futu import OpenQuoteContext, RET_OK
from datetime import datetime
import json
import argparse
import sys
import pandas as pd

# Exchange rate configuration (adjust according to real-time exchange rate, using common mid-rate here)
HKD_TO_CNY = 0.92  # 1 Hong Kong Dollar = 0.92 Chinese Yuan
USD_TO_CNY = 7.2   # 1 US Dollar = 7.2 Chinese Yuan

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
        
        if data is None or data.empty:
            print("No data returned from market snapshot")
            return
            
        print(f"Data type: {type(data)}")
        print(f"Data shape: {data.shape if hasattr(data, 'shape') else 'No shape'}")
        print(f"Data columns: {data.columns.tolist() if hasattr(data, 'columns') else 'No columns'}")
        
        stock_data = data.iloc[0]
        
        # Output all fields in JSON format
        all_fields_dict = stock_data.to_dict()
        print("=== All Fields (JSON Format) ===")
        print(json.dumps(all_fields_dict, ensure_ascii=False, indent=2))
        
        # 2. Extract core market data fields
        last_price = stock_data.get('last_price', 0)
        prev_close = stock_data.get('prev_close_price', 0)
        open_price = stock_data.get('open_price', 0)
        high_price = stock_data.get('high_price', 0)
        low_price = stock_data.get('low_price', 0)
        
        # Determine exchange rate based on stock code
        if stock_code.startswith('HK.'):
            exchange_rate = HKD_TO_CNY
            currency = 'HKD'
        elif stock_code.startswith('US.'):
            exchange_rate = USD_TO_CNY
            currency = 'USD'
        else:
            exchange_rate = 1.0
            currency = 'Unknown'
        
        # Calculate basic change rate
        change_rate = (last_price - prev_close) / prev_close * 100 if prev_close != 0 else 0
        
        # 3. Calculate intraday maximum increase/decrease (based on previous close price)
        intraday_max_increase = (high_price - prev_close) / prev_close * 100 if prev_close != 0 else 0
        intraday_max_decrease = (low_price - prev_close) / prev_close * 100 if prev_close != 0 else 0
        
        # 4. Calculate position value
        total_value_original = hold_num * last_price  # Total value in original currency
        total_value_cny = total_value_original * exchange_rate  # Total value in CNY
        
        # 5. Format and output results
        print(f"\n===== {stock_data.get('code', 'Unknown')} ({stock_data.get('name', 'Unknown')}) Market Data & Position Value =====")
        print(f"Latest Price: {last_price} {currency}")
        print(f"Price Change (%): {round(change_rate, 2)}")
        print(f"Open Price: {open_price} {currency}")
        print(f"Previous Close Price: {prev_close} {currency}")
        print(f"Highest Price: {high_price} {currency}")
        print(f"Lowest Price: {low_price} {currency}")
        print(f"Intraday Maximum Increase (%): {round(intraday_max_increase, 2)}")
        print(f"Intraday Maximum Decrease (%): {round(intraday_max_decrease, 2)}")
        print(f"Update Time: {stock_data.get('update_time', 'Unknown')}")
        
        print(f"\n===== Position Value Calculation ({hold_num} Shares) =====")
        print(f"Total Value ({currency}): {round(total_value_original, 2)} {currency}")
        print(f"Total Value (CNY): {round(total_value_cny, 2)} CNY (Exchange Rate: 1 {currency} = {exchange_rate} CNY)")

    except Exception as e:
        print(f"Error processing stock data: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        # Close the connection to avoid resource leakage
        quote_ctx.close()

def main():
    # Show command line usage example first
    print("Example: python3 futuQueryStock.py --name 09988 --type HK --num 440")
    print("Example: python3 futuQueryStock.py --name AAPL --type US --num 100")
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Query stock market data and calculate position value")
    parser.add_argument("--name", required=True, help="Stock code (e.g., 09988) or full code (e.g., HK.09988)")
    parser.add_argument("--type", required=True, help="Market type, optional values: HK/US")
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

    print(f"Querying stock: {stock_code}")
    # Call the query function
    get_stock_info(stock_code, args.num)

if __name__ == "__main__":
    main()