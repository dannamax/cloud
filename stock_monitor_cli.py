#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通用股票监控命令行工具
支持字符界面图表显示
"""

from futu import OpenQuoteContext, RET_OK, KLType, KL_FIELD
import argparse
import datetime
import pandas as pd
import numpy as np
import sys
import os

# 全局配置
HKD_TO_CNY = 0.92
USD_TO_CNY = 7.2
DEFAULT_SHARES = 440

class StockMonitorCLI:
    def __init__(self, stock_code, shares=DEFAULT_SHARES):
        self.stock_code = stock_code
        self.shares = shares
        self.quote_ctx = None
    
    def connect(self):
        """连接到Futu API"""
        try:
            self.quote_ctx = OpenQuoteContext(host='127.0.0.1', port=11111)
            return True
        except Exception as e:
            print(f"连接失败: {e}")
            return False
    
    def disconnect(self):
        """断开连接"""
        if self.quote_ctx:
            self.quote_ctx.close()
    
    def get_current_data(self):
        """获取当前股票数据"""
        if not self.quote_ctx:
            return None
            
        ret, data = self.quote_ctx.get_market_snapshot([self.stock_code])
        if ret != RET_OK:
            print(f"获取市场数据失败: {data}")
            return None
        
        if data is None or data.empty:
            print("无数据返回")
            return None
        
        stock = data.iloc[0]
        
        # 确定汇率
        if self.stock_code.startswith('HK.'):
            exchange_rate = HKD_TO_CNY
            currency = 'HKD'
        elif self.stock_code.startswith('US.'):
            exchange_rate = USD_TO_CNY
            currency = 'USD'
        else:
            exchange_rate = 1.0
            currency = 'Unknown'
        
        return {
            'code': stock.get('code', 'Unknown'),
            'name': stock.get('name', 'Unknown'),
            'last_price': stock.get('last_price', 0),
            'open_price': stock.get('open_price', 0),
            'prev_close': stock.get('prev_close_price', 0),
            'high_price': stock.get('high_price', 0),
            'low_price': stock.get('low_price', 0),
            'change_rate': ((stock.get('last_price', 0) - stock.get('prev_close_price', 0)) / 
                           stock.get('prev_close_price', 1) * 100) if stock.get('prev_close_price', 0) != 0 else 0,
            'total_value': stock.get('last_price', 0) * self.shares * exchange_rate,
            'currency': currency,
            'exchange_rate': exchange_rate
        }
    
    def get_historical_data(self, days=30):
        """获取历史K线数据"""
        if not self.quote_ctx:
            return None
        
        end_date = datetime.datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.datetime.now() - datetime.timedelta(days=days)).strftime('%Y-%m-%d')
        
        try:
            ret, data, page_req_key = self.quote_ctx.request_history_kline(
                self.stock_code, 
                start=start_date, 
                end=end_date, 
                ktype=KLType.K_DAY,
                fields=[KL_FIELD.ALL]
            )
            
            if ret != RET_OK:
                print(f"获取历史数据失败: {data}")
                return None
            
            return data
        except Exception as e:
            print(f"获取历史数据时出错: {e}")
            return None
    
    def draw_text_chart(self, data, title="股票价格走势", height=15, width=60):
        """绘制文本图表"""
        if data is None or data.empty:
            print("无数据可显示")
            return
        
        # 获取终端宽度
        try:
            terminal_width = os.get_terminal_size().columns
            width = min(width, terminal_width - 20)
        except:
            pass
        
        # 准备数据
        if 'time_key' in data.columns:
            # 历史数据
            dates = pd.to_datetime(data['time_key'])
            prices = data['close'].values
            chart_type = "daily"
        else:
            # 模拟日内数据
            now = datetime.datetime.now()
            dates = [now - datetime.timedelta(minutes=i*30) for i in range(len(data))]
            prices = data
            chart_type = "intraday"
        
        if len(prices) == 0:
            print("无价格数据")
            return
        
        # 计算价格范围
        min_price = np.min(prices)
        max_price = np.max(prices)
        price_range = max_price - min_price if max_price != min_price else 1
        
        # 创建图表
        chart = []
        
        # 添加标题
        chart.append("=" * width)
        chart.append(title.center(width))
        chart.append("=" * width)
        
        # 添加价格信息
        chart.append(f"价格范围: {min_price:.2f} - {max_price:.2f}")
        chart.append(f"当前价格: {prices[-1]:.2f}")
        if chart_type == "daily":
            chart.append(f"日期范围: {dates.iloc[0].strftime('%m-%d')} - {dates.iloc[-1].strftime('%m-%d')}")
        chart.append("-" * width)
        
        # 绘制图表
        for i in range(height):
            level = max_price - (i * price_range / (height - 1))
            line = f"{level:8.2f} "
            
            for j in range(len(prices)):
                x_pos = int(j * (width - 10) / max(len(prices) - 1, 1))
                
                # 计算当前价格位置
                price_pos = int((prices[j] - min_price) / price_range * (height - 1))
                
                if (height - 1 - price_pos) == i:
                    line += "*"
                else:
                    line += " "
            
            chart.append(line)
        
        # 添加底部标签
        chart.append("-" * width)
        if len(dates) > 1:
            if chart_type == "daily":
                chart.append(f"时间: {dates.iloc[0].strftime('%m-%d')} -> {dates.iloc[-1].strftime('%m-%d')}")
            else:
                chart.append(f"时间: {dates[0].strftime('%H:%M')} -> {dates[-1].strftime('%H:%M')}")
        
        # 打印图表
        for line in chart:
            print(line)
    
    def display_current_info(self):
        """显示当前股票信息"""
        data = self.get_current_data()
        if not data:
            return
        
        print("=" * 60)
        print(f"股票信息: {data['name']} ({data['code']})")
        print("=" * 60)
        print(f"当前价格: {data['last_price']:.2f} {data['currency']}")
        print(f"开盘价:   {data['open_price']:.2f} {data['currency']}")
        print(f"昨收价:   {data['prev_close']:.2f} {data['currency']}")
        print(f"最高价:   {data['high_price']:.2f} {data['currency']}")
        print(f"最低价:   {data['low_price']:.2f} {data['currency']}")
        print(f"涨跌幅:   {data['change_rate']:.2f}%")
        print(f"持仓价值: {data['total_value']:.2f} CNY")
        print("=" * 60)
    
    def display_daily_chart(self, days=30):
        """显示日线图表"""
        print(f"正在获取{days}天的历史数据...")
        data = self.get_historical_data(days)
        
        if data is None or data.empty:
            print("无法获取历史数据，将显示模拟数据")
            # 创建模拟数据用于演示
            base_price = 100
            prices = []
            for i in range(days):
                variation = np.random.normal(0, base_price * 0.01)
                prices.append(base_price + variation * (days-i))
            df = pd.DataFrame({'close': prices})
            self.draw_text_chart(df, title=f"{self.stock_code} 模拟日线图表 ({days}天)", height=15, width=70)
            return
        
        self.draw_text_chart(
            data, 
            title=f"{self.stock_code} 日线图表 ({days}天)", 
            height=15, 
            width=70
        )
    
    def display_intraday_chart(self):
        """显示日内分时图（模拟数据）"""
        # 获取当前数据
        current_data = self.get_current_data()
        base_price = current_data['last_price'] if current_data else 100
        
        # 创建模拟的日内数据
        prices = []
        for i in range(40):
            # 模拟价格波动
            variation = np.random.normal(0, base_price * 0.002)
            prices.append(base_price + variation)
        # 确保最后一个价格接近当前价格
        prices[-1] = base_price
        
        # 创建模拟DataFrame
        df = pd.DataFrame({'close': prices})
        
        title = f"{current_data['name'] if current_data else self.stock_code} 日内分时图"
        self.draw_text_chart(df, title=title, height=12, width=70)

def main():
    parser = argparse.ArgumentParser(description='通用股票监控命令行工具')
    parser.add_argument("--code", required=True, help="股票代码 (如: 09988 或 AAPL)")
    parser.add_argument("--market", default="HK", help="市场类型 (HK/US)")
    parser.add_argument("--shares", type=int, default=DEFAULT_SHARES, help="持股数量")
    parser.add_argument("--mode", choices=['info', 'daily', 'intraday'], default='info', 
                       help="显示模式: info(基本信息), daily(日线), intraday(日内)")
    parser.add_argument("--days", type=int, default=30, help="日线图表显示天数")
    
    args = parser.parse_args()
    
    # 处理股票代码
    if "." in args.code:
        stock_code = args.code
    else:
        stock_code = f"{args.market}.{args.code}"
    
    print(f"正在查询股票: {stock_code}")
    
    # 创建监控工具
    monitor = StockMonitorCLI(stock_code, args.shares)
    
    if not monitor.connect():
        print("无法连接到Futu API，请确保FutuOpenD已启动")
        return
    
    try:
        if args.mode == 'info':
            monitor.display_current_info()
        elif args.mode == 'daily':
            monitor.display_daily_chart(args.days)
        else:
            monitor.display_intraday_chart()
    finally:
        monitor.disconnect()

if __name__ == "__main__":
    main()