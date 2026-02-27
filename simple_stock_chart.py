#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化版股票监控与图表工具
支持天级别数据监控和可视化
"""

from futu import OpenQuoteContext, RET_OK
import argparse
import datetime
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import pandas as pd
import numpy as np
import sys

# 全局配置
HKD_TO_CNY = 0.92
DEFAULT_SHARES = 440

class SimpleStockChart:
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
        if ret != RET_OK or data.empty:
            return None
        
        stock = data.iloc[0]
        return {
            'code': stock['code'],
            'name': stock['name'],
            'last_price': stock['last_price'],
            'open_price': stock['open_price'],
            'prev_close': stock['prev_close_price'],
            'high_price': stock['high_price'],
            'low_price': stock['low_price'],
            'change_rate': ((stock['last_price'] - stock['prev_close_price']) / 
                           stock['prev_close_price'] * 100) if stock['prev_close_price'] != 0 else 0,
            'total_value': stock['last_price'] * self.shares * HKD_TO_CNY
        }
    
    def get_historical_data(self, days=30):
        """获取历史K线数据"""
        if not self.quote_ctx:
            return None
        
        end_date = datetime.datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.datetime.now() - datetime.timedelta(days=days)).strftime('%Y-%m-%d')
        
        ret, data = self.quote_ctx.get_history_kline(
            self.stock_code, 
            start=start_date, 
            end=end_date, 
            ktype='K_DAY'
        )
        
        if ret != RET_OK:
            print(f"获取历史数据失败: {data}")
            return None
        
        return data
    
    def plot_daily_chart(self, days=30):
        """绘制日线图表"""
        print(f"正在获取{days}天的历史数据...")
        data = self.get_historical_data(days)
        
        if data is None or data.empty:
            print("无法获取历史数据")
            return
        
        # 创建图表
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(15, 10))
        fig.suptitle(f'{self.stock_code} 日线图表 ({days}天)', fontsize=16)
        
        # 转换日期格式
        data['time_key'] = pd.to_datetime(data['time_key'])
        
        # 绘制收盘价走势
        ax1.plot(data['time_key'], data['close'], 'b-', linewidth=2, marker='o', markersize=4)
        ax1.fill_between(data['time_key'], data['low'], data['high'], 
                         alpha=0.3, color='lightblue')
        ax1.set_title('收盘价走势')
        ax1.set_ylabel('价格 (HKD)')
        ax1.grid(True, alpha=0.3)
        ax1.tick_params(axis='x', rotation=45)
        
        # 绘制成交量
        ax2.bar(data['time_key'], data['volume'], alpha=0.7, color='orange')
        ax2.set_title('成交量')
        ax2.set_ylabel('成交量')
        ax2.grid(True, alpha=0.3)
        ax2.tick_params(axis='x', rotation=45)
        
        # 格式化x轴日期
        ax1.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
        ax2.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
        
        plt.tight_layout()
        plt.show()
    
    def plot_intraday_chart(self):
        """绘制日内分时图（模拟数据）"""
        # 获取当前数据
        current_data = self.get_current_data()
        if not current_data:
            print("无法获取当前数据")
            return
        
        # 创建模拟的日内数据（实际应用中需要从API获取）
        now = datetime.datetime.now()
        times = [now - datetime.timedelta(minutes=i*5) for i in range(50, -1, -1)]
        base_price = current_data['last_price']
        
        # 生成模拟价格波动
        prices = [base_price + np.random.normal(0, base_price * 0.001) * i for i in range(51)]
        prices = np.array(prices)
        # 确保最后一个价格是当前价格
        prices[-1] = base_price
        
        # 创建图表
        fig, ax = plt.subplots(figsize=(12, 6))
        fig.suptitle(f'{current_data["name"]} ({current_data["code"]}) 日内分时图', fontsize=16)
        
        ax.plot(times, prices, 'b-', linewidth=2, marker='o', markersize=3)
        ax.set_title(f'当前价格: {current_data["last_price"]:.2f} HKD '
                    f'涨跌幅: {current_data["change_rate"]:.2f}% '
                    f'持仓价值: {current_data["total_value"]:.2f} CNY')
        ax.set_xlabel('时间')
        ax.set_ylabel('价格 (HKD)')
        ax.grid(True, alpha=0.3)
        ax.tick_params(axis='x', rotation=45)
        
        # 格式化x轴时间
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
        
        plt.tight_layout()
        plt.show()

def main():
    parser = argparse.ArgumentParser(description='简化版股票监控与图表工具')
    parser.add_argument("--code", required=True, help="股票代码 (如: 09988)")
    parser.add_argument("--market", default="HK", help="市场类型 (HK/US)")
    parser.add_argument("--shares", type=int, default=DEFAULT_SHARES, help="持股数量")
    parser.add_argument("--mode", choices=['daily', 'intraday'], default='daily', 
                       help="图表类型: daily(日线) 或 intraday(日内分时)")
    parser.add_argument("--days", type=int, default=30, help="日线图表显示天数")
    
    args = parser.parse_args()
    
    # 处理股票代码
    if "." in args.code:
        stock_code = args.code
    else:
        stock_code = f"{args.market}.{args.code}"
    
    # 创建图表工具
    chart_tool = SimpleStockChart(stock_code, args.shares)
    
    if not chart_tool.connect():
        print("无法连接到Futu API，请确保FutuOpenD已启动")
        return
    
    try:
        if args.mode == 'daily':
            chart_tool.plot_daily_chart(args.days)
        else:
            chart_tool.plot_intraday_chart()
    finally:
        chart_tool.disconnect()

if __name__ == "__main__":
    main()