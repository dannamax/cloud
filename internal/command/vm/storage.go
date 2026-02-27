package vm

import (
	"fmt"
	"time"

	"github.com/jdcloud/jdcloud-cli/internal/output"
	"github.com/spf13/cobra"
)

// AddStorageCommands 添加存储相关命令
func AddStorageCommands(cmd *cobra.Command) {
	cmd.AddCommand(newAttachDiskCmd())
	cmd.AddCommand(newDetachDiskCmd())
	cmd.AddCommand(newDescribeInstanceDisksCmd())
}

// newAttachDiskCmd 创建attach-disk子命令
func newAttachDiskCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "attach-disk",
		Short: "挂载云硬盘",
		Long:  "将云硬盘挂载到云主机实例",
		Args:  cobra.ExactArgs(2),
		Run: func(cmd *cobra.Command, args []string) {
			instanceID := args[0]
			diskID := args[1]
			
			// 获取参数
			deviceName, _ := cmd.Flags().GetString("device-name")
			autoDelete, _ := cmd.Flags().GetBool("auto-delete")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 模拟挂载云硬盘
			result := map[string]interface{}{
				"RequestId":   fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":     true,
				"InstanceId":  instanceID,
				"DiskId":      diskID,
				"DeviceName":  deviceName,
				"AutoDelete":  autoDelete,
			}
			
			fmt.Printf("成功挂载云硬盘 %s 到实例 %s\n", diskID, instanceID)
			if deviceName != "" {
				fmt.Printf("挂载点为: %s\n", deviceName)
			}
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	// 添加标志
	cmd.Flags().String("device-name", "", "挂载点名称")
	cmd.Flags().Bool("auto-delete", false, "随实例删除")

	return cmd
}

// newDetachDiskCmd 创建detach-disk子命令
func newDetachDiskCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "detach-disk",
		Short: "卸载云硬盘",
		Long:  "将云硬盘从云主机实例卸载",
		Args:  cobra.ExactArgs(2),
		Run: func(cmd *cobra.Command, args []string) {
			instanceID := args[0]
			diskID := args[1]
			
			// 获取参数
			force, _ := cmd.Flags().GetBool("force")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 模拟卸载云硬盘
			result := map[string]interface{}{
				"RequestId":  fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":    true,
				"InstanceId": instanceID,
				"DiskId":     diskID,
				"Force":      force,
			}
			
			fmt.Printf("成功卸载云硬盘 %s 从实例 %s\n", diskID, instanceID)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	// 添加标志
	cmd.Flags().Bool("force", false, "强制卸载")

	return cmd
}

// newDescribeInstanceDisksCmd 创建describe-instance-disks子命令
func newDescribeInstanceDisksCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "describe-instance-disks",
		Short: "查询实例磁盘信息",
		Long:  "查询云主机实例的磁盘信息",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			instanceID := args[0]
			
			// 获取参数
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 模拟磁盘信息
			disks := []map[string]interface{}{
				{
					"DiskId":     "vol-12345678",
					"DiskName":   "system-disk",
					"DiskType":   "ssd.gp1",
					"DiskSizeGB": 50,
					"Status":     "in-use",
					"Category":   "system",
					"DeviceName": "/dev/vda",
				},
				{
					"DiskId":     "vol-87654321",
					"DiskName":   "data-disk",
					"DiskType":   "ssd.io1",
					"DiskSizeGB": 100,
					"Status":     "in-use",
					"Category":   "data",
					"DeviceName": "/dev/vdb",
				},
			}
			
			result := map[string]interface{}{
				"RequestId":  fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":    true,
				"InstanceId": instanceID,
				"Disks":      disks,
			}
			
			// 输出结果
			if outputFormat == "table" {
				headers := []string{"DiskId", "DiskName", "DiskType", "DiskSizeGB", "Status", "Category", "DeviceName"}
				if err := output.Print(disks, outputFormat, headers); err != nil {
					fmt.Printf("输出失败: %v\n", err)
				}
			} else {
				if err := output.Print(result, outputFormat, []string{}); err != nil {
					fmt.Printf("输出失败: %v\n", err)
				}
			}
		},
	}

	return cmd
}