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

            # 4. Calculate daily gain/loss based on current price change
            daily_gain_loss_hkd = hold_num * (last_price - prev_close)  # Daily gain/loss in HKD
            daily_gain_loss_cny = daily_gain_loss_hkd * HKD_TO_CNY  # Daily gain/loss in CNY

            # 5. Calculate position value
            total_value_hkd = hold_num * last_price  # Total value in HKD
            total_value_cny = total_value_hkd * HKD_TO_CNY  # Total value in CNY

            # 6. Format and output results
            print(f"\n===== {stock_data['code']} Market Data & Position Value =====")
            print(f"Daily Change Rate: {round(change_rate, 2)}%({round(intraday_max_decrease, 2)}% {round(intraday_max_increase, 2)}%)")
            print(f"Latest Price: {last_price} HKD")
            print(f"Previous Close Price: {prev_close} HKD")
            print(f"Open Price: {open_price} HKD")
            print(f"Highest Price: {high_price} HKD")
            print(f"Lowest Price: {low_price} HKD")
            # Enhanced: Optimized daily change rate format (e.g., 0.8%(-1.39% 1.44%))
            print(f"Update Time: {stock_data['update_time']}")
            print(f"===== Position Value Calculation ({hold_num} Shares) =====")
            print(f"Total Value (HKD): {round(total_value_hkd, 2)} HKD")
            print(f"Total Value (CNY): {round(total_value_cny, 2)} CNY (Exchange Rate: 1 HKD = {HKD_TO_CNY} CNY)")
            # Enhanced: Daily gain/loss calculation
            print(f"===== Daily Gain/Loss Calculation ({hold_num} Shares) =====")
            print(f"Daily Gain/Loss (HKD): {round(daily_gain_loss_hkd, 2)} HKD")
            print(f"Daily Gain/Loss (CNY): {round(daily_gain_loss_cny, 2)} CNY")
            
            # Enhanced: Additional insights with English labels
            if daily_gain_loss_hkd > 0:
                print(f"Daily Profit: +{round(daily_gain_loss_hkd, 2)} HKD (+{round(daily_gain_loss_cny, 2)} CNY)")
            elif daily_gain_loss_hkd < 0:
                print(f"Daily Loss: {round(daily_gain_loss_hkd, 2)} HKD ({round(daily_gain_loss_cny, 2)} CNY)")
            else:
                print(f"⚪ Daily Break-even: 0 HKD (0 CNY)")

    finally:
        # Close the connection to avoid resource leakage
        quote_ctx.close()

def main():
    # Show command line usage example first
    print("🚀 Futu Stock Query Tool")
    print("=" * 50)
    print("Usage: python3 futuQueryStock.py --name 00700 --type HK --num 100")
    print("=" * 50)

    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Query stock market data and calculate position value (default 440 shares)")
    parser.add_argument("--name", required=True, help="Stock code (e.g., 00700) or full code (e.g., HK.00700)")
    parser.add_argument("--type", required=True, help="Market type: HK(Hong Kong)/US(US Stocks)")
    parser.add_argument("--num", type=int, default=440, help="Number of shares held, default 440 shares")
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
