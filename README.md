# Futu Hong Kong Stock Query Tool

## Project Introduction

This is a Hong Kong stock query tool based on Futu OpenAPI, which can query real-time Hong Kong stock market data, calculate position value, and analyze profit/loss situations. The tool supports command-line parameters, making it convenient for users to quickly query information about specified stocks.

## Core Files

### 1. futuQueryStock.py
**Main Features**:
- Query real-time Hong Kong stock market data
- Calculate position value and profit/loss situations
- Support multiple output formats
- Provide detailed stock information display

**Usage**:
```bash
python3 futuQueryStock.py --name 00700 --type HK --num 100
```

**Parameters**:
- `--name`: Stock code (e.g., 00700) or full code (e.g., HK.00700)
- `--type`: Market type (HK for Hong Kong stocks)
- `--num`: Number of shares held (default is 440 shares)

**Output Example**:
```
🚀 Futu Stock Query Tool
==================================================
Usage: python3 futuQueryStock.py --name 00700 --type HK --num 100
==================================================

============================================================
📊 ALL MARKET DATA FIELDS (JSON FORMAT)
============================================================
{
  "code": "HK.00700",
  "name": "Tencent Holdings",
  "last_price": 510.5,
  "prev_close_price": 512.0,
  ...
}

============================================================
📈 HK.00700 - Tencent Holdings Market Data
============================================================
💰 Latest Price: 510.50 HKD
📊 Daily Change: -0.29% (Intraday Range: -0.29% ~ -0.29%)
📈 Open Price: 510.50 HKD
📉 Previous Close: 512.00 HKD
🔺 High Price: 510.50 HKD
🔻 Low Price: 510.50 HKD
🕐 Update Time: 2024-01-01 10:20:34

------------------------------------------------------------
💼 Position Value Calculation (Holding 100 shares)
------------------------------------------------------------
💵 Total Value (HKD): 51,050.00 HKD
💴 Total Value (CNY): 46,966.00 CNY (Exchange Rate: 1 HKD = 0.92 CNY)

------------------------------------------------------------
💹 Daily Profit/Loss Calculation (Holding 100 shares)
------------------------------------------------------------
💰 Daily P/L (HKD): -150.00 HKD
💴 Daily P/L (CNY): -138.00 CNY
🔴 Loss Status: -150.00 HKD (-138.00 CNY)
============================================================
```

### 2. 1.py
**Function Description**: Basic query script that provides simple Hong Kong stock query functionality

**Usage**:
```bash
python3 1.py
```

### 3. futu-api-test.py
**Function Description**: Futu API test script for testing API connection and basic functionality

## Technical Features

1. **Based on Futu OpenAPI**: Uses official Futu OpenAPI interfaces
2. **Multi-cloud Provider Support**: Extensible to support other cloud provider APIs
3. **Formatted Output**: Provides clear JSON and table format output
4. **Automatic Calculation**: Automatically calculates position value, profit/loss, etc.
5. **Exchange Rate Conversion**: Supports automatic HKD to CNY exchange rate conversion

## Installation Dependencies

```bash
pip install futu-api
```

## Usage Scenarios

1. **Individual Investors**: Quickly query real-time market data for held stocks
2. **Investment Analysis**: Analyze intraday fluctuations and profit/loss situations of stocks
3. **Automation Scripts**: Integrate into automated investment systems
4. **Data Monitoring**: Monitor price changes of specific stocks

## Example Commands

### Single Stock Query
```bash
cd /path/to/futu && python3 futuQueryStock.py --name 07709 --type HK --num 10000
```

### Multiple Stocks Query
```bash
cd /path/to/futu && python3 1.py --names 07709 09988 03750 02513 00100 01768 --type HK
```

### Common Usage Patterns
```bash
# Query Tencent Holdings (00700) with default 440 shares
python3 futuQueryStock.py --name 00700 --type HK

# Query Meituan (03690) with 1000 shares
python3 futuQueryStock.py --name 03690 --type HK --num 1000

# Query US stock (example: Apple)
python3 futuQueryStock.py --name AAPL --type US --num 100
```

## Notes

1. Futu OpenAPI needs to be installed and the service must be running normally
2. Default connection to local Futu API service (127.0.0.1:11111)
3. Exchange rate data is for example purposes, please update to real-time rates for actual use
4. Supports Hong Kong stock queries, extensible to support US stocks and other markets

## Extended Features

- Support US stock queries (US. prefix)
- Customizable number of shares held
- Support for multiple output formats
- Provide detailed stock fundamental data