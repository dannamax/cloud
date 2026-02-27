package configure

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"github.com/jdcloud/jdcloud-cli/internal/config"
	"github.com/spf13/cobra"
)

// NewCmd 创建configure命令
func NewCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "configure",
		Short: "配置京东云CLI",
		Long:  "配置京东云CLI的认证信息、区域设置等",
		Run:   runConfigure,
	}

	// 添加子命令
	cmd.AddCommand(newListCmd())
	cmd.AddCommand(newGetCmd())
	cmd.AddCommand(newSetCmd())

	return cmd
}

// runConfigure 运行配置命令
func runConfigure(cmd *cobra.Command, args []string) {
	reader := bufio.NewReader(os.Stdin)

	// 获取当前配置
	cfg := config.GetDefaultConfig()

	fmt.Println("配置京东云CLI")
	fmt.Println("----------------")

	// 输入Access Key ID
	fmt.Print("Access Key ID: ")
	accessKeyID, _ := reader.ReadString('\n')
	accessKeyID = strings.TrimSpace(accessKeyID)
	if accessKeyID != "" {
		cfg.AccessKeyID = accessKeyID
	}

	// 输入Access Key Secret
	fmt.Print("Access Key Secret: ")
	accessKeySecret, _ := reader.ReadString('\n')
	accessKeySecret = strings.TrimSpace(accessKeySecret)
	if accessKeySecret != "" {
		cfg.AccessKeySecret = accessKeySecret
	}

	// 输入默认区域
	fmt.Print("Default Region ID [cn-north-1]: ")
	regionID, _ := reader.ReadString('\n')
	regionID = strings.TrimSpace(regionID)
	if regionID == "" {
		regionID = "cn-north-1"
	}
	cfg.RegionID = regionID

	// 输入输出格式
	fmt.Print("Default Output Format [json]: ")
	outputFormat, _ := reader.ReadString('\n')
	outputFormat = strings.TrimSpace(outputFormat)
	if outputFormat == "" {
		outputFormat = "json"
	}
	cfg.OutputFormat = outputFormat

	// 保存配置
	if err := config.SaveConfig(cfg); err != nil {
		fmt.Printf("保存配置失败: %v\n", err)
		return
	}

	fmt.Println("配置已保存")
}

// newListCmd 创建list子命令
func newListCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "list",
		Short: "列出所有配置文件",
		Run: func(cmd *cobra.Command, args []string) {
			// 这里实现列出配置文件的功能
			fmt.Println("列出所有配置文件...")
		},
	}
}

// newGetCmd 创建get子命令
func newGetCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "get [profile]",
		Short: "获取指定配置文件的设置",
		Args:  cobra.MaximumNArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			// 这里实现获取配置的功能
			fmt.Println("获取配置...")
		},
	}
}

// newSetCmd 创建set子命令
func newSetCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "set [profile] [key] [value]",
		Short: "设置配置项",
		Args:  cobra.ExactArgs(3),
		Run: func(cmd *cobra.Command, args []string) {
			// 这里实现设置配置的功能
			fmt.Println("设置配置...")
		},
	}
}