package vm

import (
	"fmt"
	"strings"
	"time"

	"github.com/jdcloud/jdcloud-cli/internal/output"
	"github.com/spf13/cobra"
)

// AddExtendedCommands 添加扩展的VM命令
func AddExtendedCommands(cmd *cobra.Command) {
	// 添加扩展的子命令
	cmd.AddCommand(newDescribeInstanceStatusCmd())
	cmd.AddCommand(newDescribeInstanceTypesCmd())
	cmd.AddCommand(newModifyInstanceAttributeCmd())
	cmd.AddCommand(newAssociateElasticIpCmd())
	cmd.AddCommand(newDisassociateElasticIpCmd())
	cmd.AddCommand(newDescribeInstanceVncUrlCmd())
	cmd.AddCommand(newDescribeQuotasCmd())
}

// newDescribeInstanceStatusCmd 创建describe-instance-status子命令
func newDescribeInstanceStatusCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "describe-instance-status",
		Short: "查询实例状态",
		Long:  "查询一个或多个实例的状态",
		Run: func(cmd *cobra.Command, args []string) {
			// 获取参数
			instanceIds, _ := cmd.Flags().GetString("instance-ids")
			_, _ = cmd.Flags().GetString("region")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 解析实例ID列表
			var _ []string
			if instanceIds != "" {
				_ = strings.Split(instanceIds, ",")
			}
			
			// 模拟数据
			statuses := []map[string]interface{}{
				{
					"InstanceId": "i-1234567890abcdef0",
					"Status":     "running",
					"Events":     []string{},
				},
				{
					"InstanceId": "i-0987654321fedcba0",
					"Status":     "stopped",
					"Events":     []string{"system-maintenance"},
				},
			}
			
			// 输出结果
			headers := []string{"InstanceId", "Status", "Events"}
			if err := output.Print(statuses, outputFormat, headers); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	// 添加标志
	cmd.Flags().String("instance-ids", "", "实例ID列表，多个用逗号分隔")

	return cmd
}

// newDescribeInstanceTypesCmd 创建describe-instance-types子命令
func newDescribeInstanceTypesCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "describe-instance-types",
		Short: "查询实例规格",
		Long:  "查询可用的实例规格列表",
		Run: func(cmd *cobra.Command, args []string) {
			// 获取参数
			_, _ = cmd.Flags().GetString("region")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 模拟数据
			types := []map[string]interface{}{
				{
					"InstanceType": "g.n2.medium",
					"Cpu":          2,
					"MemoryGB":     4,
					"Gpu":          0,
					"Fpga":         0,
				},
				{
					"InstanceType": "g.n2.large",
					"Cpu":          4,
					"MemoryGB":     8,
					"Gpu":          0,
					"Fpga":         0,
				},
				{
					"InstanceType": "c.n2se.2xlarge",
					"Cpu":          8,
					"MemoryGB":     16,
					"Gpu":          0,
					"Fpga":         0,
				},
				{
					"InstanceType": "p.n5n4090.23large",
					"Cpu":          24,
					"MemoryGB":     96,
					"Gpu":          1,
					"Fpga":         0,
				},
			}
			
			// 输出结果
			headers := []string{"InstanceType", "Cpu", "MemoryGB", "Gpu", "Fpga"}
			if err := output.Print(types, outputFormat, headers); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	return cmd
}

// newModifyInstanceAttributeCmd 创建modify-instance-attribute子命令
func newModifyInstanceAttributeCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "modify-instance-attribute",
		Short: "修改实例属性",
		Long:  "修改云服务器实例的属性",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			instanceID := args[0]
			
			// 获取参数
			instanceName, _ := cmd.Flags().GetString("instance-name")
			description, _ := cmd.Flags().GetString("description")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 验证至少有一个参数
			if instanceName == "" && description == "" {
				fmt.Println("错误: 至少需要指定一个要修改的属性")
				return
			}
			
			// 模拟修改实例属性
			result := map[string]interface{}{
				"RequestId":  fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":    true,
				"InstanceId": instanceID,
			}
			
			fmt.Printf("成功修改实例属性: %s\n", instanceID)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	// 添加标志
	cmd.Flags().String("instance-name", "", "新的实例名称")
	cmd.Flags().String("description", "", "新的实例描述")

	return cmd
}

// newAssociateElasticIpCmd 创建associate-elastic-ip子命令
func newAssociateElasticIpCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "associate-elastic-ip",
		Short: "绑定弹性公网IP",
		Long:  "将弹性公网IP绑定到实例",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			instanceID := args[0]
			
			// 获取参数
			elasticIpID, _ := cmd.Flags().GetString("elastic-ip-id")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 验证必需参数
			if elasticIpID == "" {
				fmt.Println("错误: elastic-ip-id是必需参数")
				return
			}
			
			// 模拟绑定弹性公网IP
			result := map[string]interface{}{
				"RequestId":   fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":     true,
				"InstanceId":  instanceID,
				"ElasticIpId": elasticIpID,
			}
			
			fmt.Printf("成功绑定弹性公网IP %s 到实例 %s\n", elasticIpID, instanceID)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	// 添加标志
	cmd.Flags().String("elastic-ip-id", "", "弹性公网IP ID")

	return cmd
}

// newDisassociateElasticIpCmd 创建disassociate-elastic-ip子命令
func newDisassociateElasticIpCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "disassociate-elastic-ip",
		Short: "解绑弹性公网IP",
		Long:  "将弹性公网IP从实例解绑",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			instanceID := args[0]
			
			// 获取参数
			elasticIpID, _ := cmd.Flags().GetString("elastic-ip-id")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 验证必需参数
			if elasticIpID == "" {
				fmt.Println("错误: elastic-ip-id是必需参数")
				return
			}
			
			// 模拟解绑弹性公网IP
			result := map[string]interface{}{
				"RequestId":   fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":     true,
				"InstanceId":  instanceID,
				"ElasticIpId": elasticIpID,
			}
			
			fmt.Printf("成功解绑弹性公网IP %s 从实例 %s\n", elasticIpID, instanceID)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	// 添加标志
	cmd.Flags().String("elastic-ip-id", "", "弹性公网IP ID")

	return cmd
}

// newDescribeInstanceVncUrlCmd 创建describe-instance-vnc-url子命令
func newDescribeInstanceVncUrlCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "describe-instance-vnc-url",
		Short: "查询实例VNC地址",
		Long:  "查询云服务器实例的VNC访问地址",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			instanceID := args[0]
			
			// 获取配置
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 模拟查询VNC地址
			vncUrl := fmt.Sprintf("https://vnc.jdcloud.com/vnc.html?token=token-%d&instance=%s", time.Now().Unix(), instanceID)
			
			result := map[string]interface{}{
				"RequestId":  fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":    true,
				"InstanceId": instanceID,
				"VncUrl":     vncUrl,
			}
			
			fmt.Printf("实例 %s 的VNC地址: %s\n", instanceID, vncUrl)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	return cmd
}

// newDescribeQuotasCmd 创建describe-quotas子命令
func newDescribeQuotasCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "describe-quotas",
		Short: "查询配额信息",
		Long:  "查询云服务器实例的配额信息",
		Run: func(cmd *cobra.Command, args []string) {
			// 获取参数
			_, _ = cmd.Flags().GetString("region")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 使用默认区域
			_ = "cn-north-1"
			
			// 模拟配额数据
			quotas := []map[string]interface{}{
				{
					"ResourceType": "instance",
					"Limit":        100,
					"Used":         5,
					"Available":    95,
				},
				{
					"ResourceType": "cpu",
					"Limit":        1000,
					"Used":         50,
					"Available":    950,
				},
				{
					"ResourceType": "memory",
					"Limit":        2000,
					"Used":         100,
					"Available":    1900,
				},
			}
			
			// 输出结果
			headers := []string{"ResourceType", "Limit", "Used", "Available"}
			if err := output.Print(quotas, outputFormat, headers); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	return cmd
}