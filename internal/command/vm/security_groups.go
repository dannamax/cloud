package vm

import (
	"fmt"
	"time"

	"github.com/jdcloud/jdcloud-cli/internal/output"
	"github.com/spf13/cobra"
)

// AddSecurityGroupCommands 添加安全组相关命令
func AddSecurityGroupCommands(cmd *cobra.Command) {
	cmd.AddCommand(newDescribeSecurityGroupsCmd())
	cmd.AddCommand(newAuthorizeSecurityGroupCmd())
	cmd.AddCommand(newRevokeSecurityGroupCmd())
}

// newDescribeSecurityGroupsCmd 创建describe-security-groups子命令
func newDescribeSecurityGroupsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "describe-security-groups",
		Short: "查询安全组列表",
		Long:  "查询可用的安全组列表",
		Run: func(cmd *cobra.Command, args []string) {
			// 获取参数
			vpcId, _ := cmd.Flags().GetString("vpc-id")
			region, _ := cmd.Flags().GetString("region")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 如果未指定区域，使用配置中的默认区域
			if region == "" {
				region = "cn-north-1"
			}
			
			// 模拟安全组数据
			securityGroups := []map[string]interface{}{
				{
					"SecurityGroupId":   "sg-3kv3q03s0n",
					"SecurityGroupName": "默认安全组开放全部端口",
					"Description":       "系统自动创建的安全组",
					"VpcId":             "vpc-mqc9whu8ka",
					"CreatedTime":       "2023-01-01T00:00:00Z",
					"RuleCount":         8,
				},
				{
					"SecurityGroupId":   "sg-lklohllx8d",
					"SecurityGroupName": "默认安全组开放全部端口",
					"Description":       "系统自动创建的安全组",
					"VpcId":             "vpc-7luxrrwh0q",
					"CreatedTime":       "2023-01-01T00:00:00Z",
					"RuleCount":         6,
				},
				{
					"SecurityGroupId":   "sg-custom-12345678",
					"SecurityGroupName": "Web服务器安全组",
					"Description":       "Web服务器专用安全组",
					"VpcId":             "vpc-mqc9whu8ka",
					"CreatedTime":       time.Now().Add(-24 * time.Hour).Format("2006-01-02T15:04:05Z"),
					"RuleCount":         4,
				},
			}
			
			// 应用过滤条件
			filteredGroups := []map[string]interface{}{}
			for _, sg := range securityGroups {
				// 过滤VPC
				if vpcId != "" && sg["VpcId"].(string) != vpcId {
					continue
				}
				filteredGroups = append(filteredGroups, sg)
			}
			
			// 输出结果
			if outputFormat == "table" {
				headers := []string{"SecurityGroupId", "SecurityGroupName", "Description", "VpcId", "CreatedTime", "RuleCount"}
				if err := output.Print(filteredGroups, outputFormat, headers); err != nil {
					fmt.Printf("输出失败: %v\n", err)
				}
			} else {
				result := map[string]interface{}{
					"RequestId":      fmt.Sprintf("req-%d", time.Now().Unix()),
					"Success":        true,
					"SecurityGroups": filteredGroups,
				}
				if err := output.Print(result, outputFormat, []string{}); err != nil {
					fmt.Printf("输出失败: %v\n", err)
				}
			}
		},
	}

	// 添加标志
	cmd.Flags().String("vpc-id", "", "VPC ID")

	return cmd
}

// newAuthorizeSecurityGroupCmd 创建authorize-security-group子命令
func newAuthorizeSecurityGroupCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "authorize-security-group",
		Short: "添加安全组规则",
		Long:  "为安全组添加入站或出站规则",
		Run: func(cmd *cobra.Command, args []string) {
			// 获取参数
			securityGroupId, _ := cmd.Flags().GetString("security-group-id")
			direction, _ := cmd.Flags().GetString("direction")
			protocol, _ := cmd.Flags().GetString("protocol")
			portRange, _ := cmd.Flags().GetString("port-range")
			cidrIp, _ := cmd.Flags().GetString("cidr-ip")
			_, _ = cmd.Flags().GetString("description")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 验证必需参数
			if securityGroupId == "" || direction == "" || protocol == "" {
				fmt.Println("错误: security-group-id, direction和protocol是必需参数")
				return
			}
			
			// 模拟添加安全组规则
			ruleId := fmt.Sprintf("rule-%d", time.Now().Unix())
			
			result := map[string]interface{}{
				"RequestId":       fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":         true,
				"SecurityGroupId": securityGroupId,
				"RuleId":          ruleId,
			}
			
			fmt.Printf("成功添加安全组规则: %s\n", ruleId)
			fmt.Printf("方向: %s, 协议: %s", direction, protocol)
			if portRange != "" {
				fmt.Printf(", 端口范围: %s", portRange)
			}
			if cidrIp != "" {
				fmt.Printf(", CIDR: %s", cidrIp)
			}
			fmt.Println()
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	// 添加标志
	cmd.Flags().String("security-group-id", "", "安全组ID (必需)")
	cmd.Flags().String("direction", "", "规则方向 (ingress/egress) (必需)")
	cmd.Flags().String("protocol", "", "协议类型 (tcp/udp/icmp/all) (必需)")
	cmd.Flags().String("port-range", "", "端口范围 (如: 80, 22-23)")
	cmd.Flags().String("cidr-ip", "", "CIDR IP地址")
	cmd.Flags().String("description", "", "规则描述")

	return cmd
}

// newRevokeSecurityGroupCmd 创建revoke-security-group子命令
func newRevokeSecurityGroupCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "revoke-security-group",
		Short: "删除安全组规则",
		Long:  "删除安全组的入站或出站规则",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			ruleId := args[0]
			
			// 获取参数
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 模拟删除安全组规则
			result := map[string]interface{}{
				"RequestId": fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":   true,
				"RuleId":    ruleId,
			}
			
			fmt.Printf("成功删除安全组规则: %s\n", ruleId)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}
}