#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查Futu API权限的工具
显示用户当前拥有的行情权限
"""

from futu import OpenQuoteContext, RET_OK, SysNotifyHandlerBase, SysNotifyType
import time

class PermissionChecker(SysNotifyHandlerBase):
    def __init__(self):
        self.permissions = {}
        
    def on_recv_rsp(self, rsp_str):
        ret_code, data = super(PermissionChecker, self).on_recv_rsp(rsp_str)
        notify_type, sub_type, msg = data
        
        if ret_code != RET_OK:
            print(f"权限检查失败: {data}")
            return RET_OK, data
            
        if notify_type == SysNotifyType.QOT_RIGHT:
            self.permissions = msg
            print("=== 当前行情权限状态 ===")
            
            # 港股权限
            hk_right = msg.get('hk_qot_right', '未知')
            print(f"港股行情权限: {self._format_permission(hk_right)}")
            
            # 美股权限
            us_right = msg.get('us_qot_right', '未知')
            print(f"美股行情权限: {self._format_permission(us_right)}")
            
            # 其他权限
            us_option = msg.get('us_option_qot_right', '未知')
            print(f"美股期权权限: {self._format_permission(us_option)}")
            
            hk_option = msg.get('hk_option_qot_right', '未知')
            print(f"港股期权权限: {self._format_permission(hk_option)}")
            
            cn_right = msg.get('cn_qot_right', '未知')
            print(f"A股行情权限: {self._format_permission(cn_right)}")
            
            print("\n=== 权限说明 ===")
            print("1 - 无权限")
            print("2 - 部分权限")
            print("3 - 完整权限")
            
            if us_right in [1, '1']:
                print("\n⚠️  提示：您当前没有美股行情权限")
                print("解决方案：")
                print("1. 在Futu OpenD客户端中开通美股行情权限")
                print("2. 或联系富途客服申请美股行情权限")
                print("3. 或使用模拟账户进行测试")
                
        return RET_OK, data
    
    def _format_permission(self, value):
        """格式化权限值"""
        if value == 1 or value == '1':
            return "❌ 无权限"
        elif value == 2 or value == '2':
            return "⚠️  部分权限"
        elif value == 3 or value == '3':
            return "✅ 完整权限"
        else:
            return f"❓ 未知({value})"

def check_permissions():
    """检查用户行情权限"""
    print("正在检查Futu API行情权限...")
    
    quote_ctx = OpenQuoteContext(host='127.0.0.1', port=11111)
    
    try:
        # 设置权限检查处理器
        handler = PermissionChecker()
        quote_ctx.set_handler(handler)
        
        # 等待权限信息推送
        print("等待权限信息...")
        time.sleep(3)  # 等待3秒接收权限信息
        
        if not handler.permissions:
            print("未收到权限信息，请确保Futu OpenD已启动并登录")
            
    except Exception as e:
        print(f"检查权限时出错: {e}")
        
    finally:
        quote_ctx.close()

def main():
    print("=" * 50)
    print("Futu API 权限检查工具")
    print("=" * 50)
    
    check_permissions()
    
    print("\n" + "=" * 50)
    print("如需开通权限，请：")
    print("1. 打开Futu OpenD客户端")
    print("2. 进入设置 -> 行情权限")
    print("3. 开通所需市场的行情权限")
    print("=" * 50)

if __name__ == "__main__":
    main()