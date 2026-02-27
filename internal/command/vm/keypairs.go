package vm

import (
	"fmt"
	"strings"
	"time"

	"github.com/jdcloud/jdcloud-cli/internal/output"
	"github.com/spf13/cobra"
)

// AddKeypairCommands 添加密钥对相关命令
func AddKeypairCommands(cmd *cobra.Command) {
	cmd.AddCommand(newDescribeKeypairsCmd())
	cmd.AddCommand(newCreateKeypairCmd())
	cmd.AddCommand(newDeleteKeypairCmd())
	cmd.AddCommand(newImportKeypairCmd())
}

// newDescribeKeypairsCmd 创建describe-keypairs子命令
func newDescribeKeypairsCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "describe-keypairs",
		Short: "查询密钥对列表",
		Long:  "查询可用的密钥对列表",
		Run: func(cmd *cobra.Command, args []string) {
			// 获取参数
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 模拟密钥对数据
			keypairs := []map[string]interface{}{
				{
					"KeypairName": "my-keypair-01",
					"KeypairId":   "kp-12345678",
					"CreateTime":  "2023-01-01T00:00:00Z",
					"FingerPrint": "SHA256:abcd1234...",
					"Description": "我的默认密钥对",
				},
				{
					"KeypairName": "prod-keypair",
					"KeypairId":   "kp-87654321",
					"CreateTime":  "2023-06-15T10:30:00Z",
					"FingerPrint": "SHA256:efgh5678...",
					"Description": "生产环境密钥对",
				},
			}
			
			// 输出结果
			if outputFormat == "table" {
				headers := []string{"KeypairName", "KeypairId", "CreateTime", "FingerPrint", "Description"}
				if err := output.Print(keypairs, outputFormat, headers); err != nil {
					fmt.Printf("输出失败: %v\n", err)
				}
			} else {
				result := map[string]interface{}{
					"RequestId": fmt.Sprintf("req-%d", time.Now().Unix()),
					"Success":   true,
					"Keypairs":  keypairs,
				}
				if err := output.Print(result, outputFormat, []string{}); err != nil {
					fmt.Printf("输出失败: %v\n", err)
				}
			}
		},
	}
}

// newCreateKeypairCmd 创建create-keypair子命令
func newCreateKeypairCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create-keypair",
		Short: "创建密钥对",
		Long:  "创建新的SSH密钥对",
		Run: func(cmd *cobra.Command, args []string) {
			// 获取参数
			keypairName, _ := cmd.Flags().GetString("keypair-name")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 验证必需参数
			if keypairName == "" {
				fmt.Println("错误: keypair-name是必需参数")
				return
			}
			
			// 模拟创建密钥对
			keypairId := "kp-" + fmt.Sprintf("%08d", time.Now().Unix())
			fingerprint := "SHA256:" + fmt.Sprintf("%x", time.Now().Unix())
			
			// 模拟私钥（实际应用中应该生成真实的RSA密钥对）
			privateKey := fmt.Sprintf("-----BEGIN RSA PRIVATE KEY-----\n模拟私钥内容-%d\n-----END RSA PRIVATE KEY-----", time.Now().Unix())
			
			result := map[string]interface{}{
				"RequestId":   fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":     true,
				"KeypairName": keypairName,
				"KeypairId":   keypairId,
				"FingerPrint": fingerprint,
				"PrivateKey":  privateKey,
			}
			
			fmt.Printf("成功创建密钥对: %s (%s)\n", keypairName, keypairId)
			fmt.Println("\n请妥善保存私钥内容：")
			fmt.Println(strings.Repeat("=", 50))
			fmt.Println(privateKey)
			fmt.Println(strings.Repeat("=", 50))
			fmt.Println("\n⚠️  警告：私钥只会显示一次，请立即保存到安全位置！")
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	// 添加标志
	cmd.Flags().String("keypair-name", "", "密钥对名称 (必需)")

	return cmd
}

// newDeleteKeypairCmd 创建delete-keypair子命令
func newDeleteKeypairCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "delete-keypair",
		Short: "删除密钥对",
		Long:  "删除指定的密钥对",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			keypairName := args[0]
			
			// 获取参数
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 模拟删除密钥对
			result := map[string]interface{}{
				"RequestId":   fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":     true,
				"KeypairName": keypairName,
			}
			
			fmt.Printf("成功删除密钥对: %s\n", keypairName)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}
}

// newImportKeypairCmd 创建import-keypair子命令
func newImportKeypairCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "import-keypair",
		Short: "导入密钥对",
		Long:  "导入已有的公钥创建密钥对",
		Run: func(cmd *cobra.Command, args []string) {
			// 获取参数
			keypairName, _ := cmd.Flags().GetString("keypair-name")
			publicKey, _ := cmd.Flags().GetString("public-key")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 验证必需参数
			if keypairName == "" || publicKey == "" {
				fmt.Println("错误: keypair-name和public-key是必需参数")
				return
			}
			
			// 模拟导入密钥对
			keypairId := "kp-" + fmt.Sprintf("%08d", time.Now().Unix())
			fingerprint := "SHA256:" + fmt.Sprintf("%x", time.Now().Unix())
			
			result := map[string]interface{}{
				"RequestId":   fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":     true,
				"KeypairName": keypairName,
				"KeypairId":   keypairId,
				"FingerPrint": fingerprint,
			}
			
			fmt.Printf("成功导入密钥对: %s (%s)\n", keypairName, keypairId)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	// 添加标志
	cmd.Flags().String("keypair-name", "", "密钥对名称 (必需)")
	cmd.Flags().String("public-key", "", "公钥内容 (必需)")

	return cmd
}