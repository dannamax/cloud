package command

import (
	"fmt"
	"github.com/jdcloud/jdcloud-cli/internal/command/configure"
	"github.com/jdcloud/jdcloud-cli/internal/command/oss"
	"github.com/jdcloud/jdcloud-cli/internal/command/vm"
	"github.com/jdcloud/jdcloud-cli/internal/command/vpc"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "jdcloud",
	Short: "京东云命令行工具",
	Long: `京东云CLI是一个统一的管理工具，用于管理京东云资源。
您可以使用它来启动、停止、配置和管理您的云资源。`,
}

// Execute 执行根命令
func Execute() error {
	return rootCmd.Execute()
}

func init() {
	// 添加全局标志
	rootCmd.PersistentFlags().String("profile", "", "使用指定的配置文件")
	rootCmd.PersistentFlags().String("region", "", "指定区域ID")
	rootCmd.PersistentFlags().String("output", "json", "输出格式 (json, yaml, table)")
	rootCmd.PersistentFlags().Bool("debug", false, "启用调试模式")

	// 添加子命令
	rootCmd.AddCommand(configure.NewCmd())
	rootCmd.AddCommand(vm.NewCmd())
	rootCmd.AddCommand(vpc.NewCmd())
	rootCmd.AddCommand(oss.NewCmd())
	rootCmd.AddCommand(versionCmd())
}

// versionCmd 版本命令
func versionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "显示版本信息",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("JDCloud CLI v0.1.0")
		},
	}
}