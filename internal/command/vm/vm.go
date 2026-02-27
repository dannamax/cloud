package vm

import (
	"fmt"
	"time"

	"github.com/jdcloud/jdcloud-cli/internal/api"
	"github.com/jdcloud/jdcloud-cli/internal/auth"
	"github.com/jdcloud/jdcloud-cli/internal/config"
	"github.com/jdcloud/jdcloud-cli/internal/output"
	"github.com/spf13/cobra"
)

// NewCmd 创建vm命令
func NewCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "vm",
		Short: "云服务器管理",
		Long:  "管理京东云云服务器（VM）实例",
	}

	// 添加子命令
	cmd.AddCommand(newDescribeInstancesCmd())
	cmd.AddCommand(newCreateInstanceCmd())
	cmd.AddCommand(newStartInstanceCmd())
	cmd.AddCommand(newStopInstanceCmd())
	cmd.AddCommand(newRebootInstanceCmd())
	cmd.AddCommand(newDeleteInstanceCmd())

	return cmd
}

// newDescribeInstancesCmd 创建describe-instances子命令
func newDescribeInstancesCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "describe-instances",
		Short: "列出云服务器实例",
		Long:  "列出当前区域下的所有云服务器实例",
		Run: func(cmd *cobra.Command, args []string) {
			// 获取配置
			profile, _ := cmd.Flags().GetString("profile")
			region, _ := cmd.Flags().GetString("region")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 如果未指定区域，使用配置中的默认区域
			if region == "" {
				cfg, err := config.LoadConfig(profile)
				if err == nil && cfg.RegionID != "" {
					region = cfg.RegionID
				} else {
					region = "cn-north-1"
				}
			}
			
			// 检查是否使用模拟模式
			if auth.IsMockMode() {
				// 模拟数据
				instances := []map[string]interface{}{
					{
						"InstanceId":   "i-1234567890abcdef0",
						"InstanceName": "web-server-01",
						"InstanceType": "g.n2.medium",
						"Status":       "running",
						"PrivateIp":    "192.168.1.10",
						"PublicIp":     "114.114.114.10",
						"Region":       region,
						"CreatedTime":  time.Now().Add(-24 * time.Hour).Format("2006-01-02T15:04:05Z"),
					},
					{
						"InstanceId":   "i-0987654321fedcba0",
						"InstanceName": "db-server-01",
						"InstanceType": "g.n2.large",
						"Status":       "stopped",
						"PrivateIp":    "192.168.1.20",
						"PublicIp":     "",
						"Region":       region,
						"CreatedTime":  time.Now().Add(-48 * time.Hour).Format("2006-01-02T15:04:05Z"),
					},
				}
				
				// 输出结果
				headers := []string{"InstanceId", "InstanceName", "InstanceType", "Status", "PrivateIp", "PublicIp", "Region", "CreatedTime"}
				if err := output.Print(instances, outputFormat, headers); err != nil {
					fmt.Printf("输出失败: %v\n", err)
				}
			} else {
				// 获取客户端
				client, err := auth.GetJDCloudClient(region, profile)
				if err != nil {
					fmt.Printf("获取客户端失败: %v\n", err)
					return
				}
				
				// 创建API客户端
				apiClient := api.NewClient(&client.Credential, region)
				
				// 检查是否启用调试模式
				if debug, _ := cmd.Flags().GetBool("debug"); debug {
					apiClient.DebugMode()
				}
				
				// 发送请求
				result, err := apiClient.DescribeInstances()
				if err != nil {
					fmt.Printf("获取实例列表失败: %v\n", err)
					fmt.Println("提示：请确保您的Access Key ID和Secret Key有效，并且有权限访问VM服务。")
					fmt.Println("您可以在京东云控制台 -> 访问控制 -> 访问密钥管理中查看和管理您的密钥。")
					return
				}
				
				// 输出结果
				if err := output.Print(result, outputFormat, []string{}); err != nil {
					fmt.Printf("输出失败: %v\n", err)
				}
			}
		},
	}
}

// newCreateInstanceCmd 创建create-instance子命令
func newCreateInstanceCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create-instance",
		Short: "创建云服务器实例",
		Long:  "创建一个新的云服务器实例",
		Run: func(cmd *cobra.Command, args []string) {
			// 获取参数
			imageID, _ := cmd.Flags().GetString("image-id")
			instanceType, _ := cmd.Flags().GetString("instance-type")
			_, _ = cmd.Flags().GetString("instance-name")
			_, _ = cmd.Flags().GetString("password")
			_, _ = cmd.Flags().GetString("vpc-id")
			_, _ = cmd.Flags().GetString("subnet-id")
			
			// 验证必需参数
			if imageID == "" || instanceType == "" {
				fmt.Println("错误: image-id和instance-type是必需参数")
				return
			}
			
			// 获取配置
			profile, _ := cmd.Flags().GetString("profile")
			region, _ := cmd.Flags().GetString("region")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 如果未指定区域，使用配置中的默认区域
			if region == "" {
				cfg, err := config.LoadConfig(profile)
				if err == nil && cfg.RegionID != "" {
					region = cfg.RegionID
				} else {
					region = "cn-north-1"
				}
			}
			
			// 模拟创建实例
			newInstanceID := "i-" + fmt.Sprintf("%017d", time.Now().Unix())
			
			// 准备输出数据
			result := map[string]interface{}{
				"RequestId":   fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":     true,
				"InstanceIds": []string{newInstanceID},
			}
			
			fmt.Printf("成功创建实例: %s\n", newInstanceID)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	// 添加标志
	cmd.Flags().String("image-id", "", "镜像ID")
	cmd.Flags().String("instance-type", "", "实例规格")
	cmd.Flags().String("instance-name", "", "实例名称")
	cmd.Flags().String("password", "", "实例密码")
	cmd.Flags().String("vpc-id", "", "VPC ID")
	cmd.Flags().String("subnet-id", "", "子网ID")

	return cmd
}

// newStartInstanceCmd 创建start-instance子命令
func newStartInstanceCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "start-instance",
		Short: "启动云服务器实例",
		Long:  "启动指定的云服务器实例",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			instanceID := args[0]
			
			// 获取配置
			profile, _ := cmd.Flags().GetString("profile")
			region, _ := cmd.Flags().GetString("region")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 如果未指定区域，使用配置中的默认区域
			if region == "" {
				cfg, err := config.LoadConfig(profile)
				if err == nil && cfg.RegionID != "" {
					region = cfg.RegionID
				} else {
					region = "cn-north-1"
				}
			}
			
			// 模拟启动实例
			result := map[string]interface{}{
				"RequestId":  fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":    true,
				"InstanceId": instanceID,
			}
			
			fmt.Printf("成功启动实例: %s\n", instanceID)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}
}

// newStopInstanceCmd 创建stop-instance子命令
func newStopInstanceCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "stop-instance",
		Short: "停止云服务器实例",
		Long:  "停止指定的云服务器实例",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			instanceID := args[0]
			
			// 获取配置
			profile, _ := cmd.Flags().GetString("profile")
			region, _ := cmd.Flags().GetString("region")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 如果未指定区域，使用配置中的默认区域
			if region == "" {
				cfg, err := config.LoadConfig(profile)
				if err == nil && cfg.RegionID != "" {
					region = cfg.RegionID
				} else {
					region = "cn-north-1"
				}
			}
			
			// 模拟停止实例
			result := map[string]interface{}{
				"RequestId":  fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":    true,
				"InstanceId": instanceID,
			}
			
			fmt.Printf("成功停止实例: %s\n", instanceID)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}
}

// newRebootInstanceCmd 创建reboot-instance子命令
func newRebootInstanceCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "reboot-instance",
		Short: "重启云服务器实例",
		Long:  "重启指定的云服务器实例",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			instanceID := args[0]
			
			// 获取配置
			profile, _ := cmd.Flags().GetString("profile")
			region, _ := cmd.Flags().GetString("region")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 如果未指定区域，使用配置中的默认区域
			if region == "" {
				cfg, err := config.LoadConfig(profile)
				if err == nil && cfg.RegionID != "" {
					region = cfg.RegionID
				} else {
					region = "cn-north-1"
				}
			}
			
			// 模拟重启实例
			result := map[string]interface{}{
				"RequestId":  fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":    true,
				"InstanceId": instanceID,
			}
			
			fmt.Printf("成功重启实例: %s\n", instanceID)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}
}

// newDeleteInstanceCmd 创建delete-instance子命令
func newDeleteInstanceCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "delete-instance",
		Short: "删除云服务器实例",
		Long:  "删除指定的云服务器实例",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			instanceID := args[0]
			
			// 获取配置
			profile, _ := cmd.Flags().GetString("profile")
			region, _ := cmd.Flags().GetString("region")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 如果未指定区域，使用配置中的默认区域
			if region == "" {
				cfg, err := config.LoadConfig(profile)
				if err == nil && cfg.RegionID != "" {
					region = cfg.RegionID
				} else {
					region = "cn-north-1"
				}
			}
			
			// 模拟删除实例
			result := map[string]interface{}{
				"RequestId":  fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":    true,
				"InstanceId": instanceID,
			}
			
			fmt.Printf("成功删除实例: %s\n", instanceID)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}
}