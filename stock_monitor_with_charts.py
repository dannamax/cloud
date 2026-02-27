#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
股票监控与动态曲线查看工具
支持天级别数据监控和可视化
"""

from futu import OpenQuoteContext, RET_OK
import argparse
import json
import sys
import datetime
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.animation import FuncAnimation
import pandas as pd
import numpy as np
import threading
import time
from collections import deque

# 全局配置
HKD_TO_CNY = 0.92
DEFAULT_SHARES = 440
MAX_DATA_POINTS = 100  # 最多保留的数据点数量

class StockMonitor:
    def __init__(self, stock_code, shares=DEFAULT_SHARES):
        self.stock_code = stock_code
        self.shares = shares
        self.quote_ctx = None
        self.historical_data = deque(maxlen=MAX_DATA_POINTS)
        self.is_monitoring = False
        
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
    
    def get_stock_data(self):
        """获取股票当前数据"""
        if not self.quote_ctx:
            return None
            
        ret, data = self.quote_ctx.get_market_snapshot([self.stock_code])
        if ret != RET_OK or data.empty:
            return None
        
        stock = data.iloc[0]
        current_time = datetime.datetime.now()
        
        stock_info = {
            'time': current_time,
            'code': stock['code'],
            'name': stock['name'],
            'last_price': stock['last_price'],
            'open_price': stock['open_price'],
            'prev_close': stock['prev_close_price'],
            'high_price': stock['high_price'],
            'low_price': stock['low_price'],
            'update_time': stock['update_time']
        }
        
        # 计算收益率
        stock_info['change_rate'] = ((stock_info['last_price'] - stock_info['prev_close']) / 
                                    stock_info['prev_close'] * 100) if stock_info['prev_close'] != 0 else 0
        
        # 计算持仓价值
        stock_info['total_value_hkd'] = stock_info['last_price'] * self.shares
        stock_info['total_value_cny'] = stock_info['total_value_hkd'] * HKD_TO_CNY
        
        return stock_info
    
    def get_historical_kline(self, days=30):
        """获取历史K线数据用于绘制日线"""
        if not self.quote_ctx:
            return None
            
        # 获取日线数据
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
    
    def start_monitoring(self, interval=60):
        """开始监控股票数据"""
        self.is_monitoring = True
        print(f"开始监控 {self.stock_code}，更新间隔: {interval}秒")
        
        while self.is_monitoring:
            try:
                data = self.get_stock_data()
                if data:
                    self.historical_data.append(data)
                    print(f"[{data['time'].strftime('%H:%M:%S')}] "
                          f"{data['name']}({data['code']}) "
                          f"价格: {data['last_price']} HKD "
                          f"涨跌幅: {data['change_rate']:.2f}% "
                          f"持仓价值: {data['total_value_cny']:.2f} CNY")
                time.sleep(interval)
            except Exception as e:
                print(f"监控过程中出错: {e}")
                time.sleep(interval)
    
    def stop_monitoring(self):
        """停止监控"""
        self.is_monitoring = False

class StockChart:
    def __init__(self, stock_monitor):
        self.monitor = stock_monitor
        self.fig, (self.ax1, self.ax2) = plt.subplots(2, 1, figsize=(12, 10))
        self.fig.suptitle(f'{stock_monitor.stock_code} 实时股票监控', fontsize=16)
        
    def update_chart(self, frame):
        """更新图表"""
        if not self.monitor.historical_data:
            return
        
        # 转换为DataFrame便于处理
        df = pd.DataFrame(list(self.monitor.historical_data))
        
        # 清空子图
        self.ax1.clear()
        self.ax2.clear()
        
        # 绘制价格曲线
        self.ax1.plot(df['time'], df['last_price'], 'b-', linewidth=2, marker='o', markersize=3)
        self.ax1.set_title('实时价格走势')
        self.ax1.set_ylabel('价格 (HKD)')
        self.ax1.grid(True, alpha=0.3)
        self.ax1.tick_params(axis='x', rotation=45)
        
        # 绘制持仓价值曲线
        self.ax2.plot(df['time'], df['total_value_cny'], 'g-', linewidth=2, marker='s', markersize=3)
        self.ax2.set_title('持仓价值变化 (CNY)')
        self.ax2.set_ylabel('价值 (CNY)')
        self.ax2.grid(True, alpha=0.3)
        self.ax2.tick_params(axis='x', rotation=45)
        
        # 格式化x轴日期
        self.ax1.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
        self.ax2.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
        
        # 调整布局
        plt.tight_layout()
    
    def plot_daily_chart(self, days=30):
        """绘制日线图表"""
        print(f"正在获取{days}天的历史数据...")
        historical_data = self.monitor.get_historical_kline(days)
        
        if historical_data is None or historical_data.empty:
            print("无法获取历史数据")
            return
        
        # 创建日线图表
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(15, 10))
        fig.suptitle(f'{self.monitor.stock_code} 日线图表 ({days}天)', fontsize=16)
        
        # 转换日期格式
        historical_data['time_key'] = pd.to_datetime(historical_data['time_key'])
        
        # 绘制K线图（简化版）
        ax1.plot(historical_data['time_key'], historical_data['close'], 'b-', linewidth=2, marker='o', markersize=3)
        ax1.fill_between(historical_data['time_key'], historical_data['low'], historical_data['high'], 
                         alpha=0.3, color='lightblue')
        ax1.set_title('收盘价走势')
        ax1.set_ylabel('价格 (HKD)')
        ax1.grid(True, alpha=0.3)
        ax1.tick_params(axis='x', rotation=45)
        
        # 绘制成交量
        ax2.bar(historical_data['time_key'], historical_data['volume'], alpha=0.7, color='orange')
        ax2.set_title('成交量')
        ax2.set_ylabel('成交量')
        ax2.grid(True, alpha=0.3)
        ax2.tick_params(axis='x', rotation=45)
        
        # 格式化x轴日期
        ax1.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
        ax2.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
        
        plt.tight_layout()
        plt.show()

def main():
    parser = argparse.ArgumentParser(description='股票监控与动态曲线查看工具')
    parser.add_argument("--code", required=True, help="股票代码 (如: 09988)")
    parser.add_argument("--market", default="HK", help="市场类型 (HK/US)")
    parser.add_argument("--shares", type=int, default=DEFAULT_SHARES, help="持股数量")
    parser.add_argument("--mode", choices=['realtime', 'daily'], default='realtime', 
                       help="显示模式: realtime(实时监控) 或 daily(日线图表)")
    parser.add_argument("--days", type=int, default=30, help="日线图表显示天数")
    parser.add_argument("--interval", type=int, default=60, help="实时更新间隔(秒)")
    
    args = parser.parse_args()
    
    # 处理股票代码
    if "." in args.code:
        stock_code = args.code
    else:
        stock_code = f"{args.market}.{args.code}"
    
    # 创建监控器
    monitor = StockMonitor(stock_code, args.shares)
    
    if not monitor.connect():
        print("无法连接到Futu API，请确保FutuOpenD已启动")
        return
    
    try:
        if args.mode == 'daily':
            # 显示日线图表
            chart = StockChart(monitor)
            chart.plot_daily_chart(args.days)
        else:
            # 实时动态监控
            chart = StockChart(monitor)
            
            # 启动监控线程
            monitor_thread = threading.Thread(target=monitor.start_monitoring, args=(args.interval,))
            monitor_thread.daemon = True
            monitor_thread.start()
            
            # 创建动画
            ani = FuncAnimation(chart.fig, chart.update_chart, interval=1000)
            
            print("按 Ctrl+C 停止监控")
            plt.show()
            
            # 停止监控
            monitor.stop_monitoring()
            
    finally:
        monitor.disconnect()

if __name__ == "__main__":
    main()