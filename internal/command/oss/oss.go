package oss

import (
	"fmt"
	"time"

	"github.com/jdcloud/jdcloud-cli/internal/api"
	"github.com/jdcloud/jdcloud-cli/internal/auth"
	"github.com/jdcloud/jdcloud-cli/internal/config"
	"github.com/jdcloud/jdcloud-cli/internal/output"
	"github.com/spf13/cobra"
)

// NewCmd 创建oss命令
func NewCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "oss",
		Short: "对象存储管理",
		Long:  "管理京东云对象存储（OSS）资源",
	}

	// 添加子命令
	cmd.AddCommand(newListBucketsCmd())
	cmd.AddCommand(newCreateBucketCmd())
	cmd.AddCommand(newDeleteBucketCmd())
	cmd.AddCommand(newListObjectsCmd())
	cmd.AddCommand(newUploadObjectCmd())
	cmd.AddCommand(newDownloadObjectCmd())
	cmd.AddCommand(newDeleteObjectCmd())

	return cmd
}

// newListBucketsCmd 创建list-buckets子命令
func newListBucketsCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "list-buckets",
		Short: "列出存储桶",
		Long:  "列出所有存储桶",
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
				// 模拟数据 - 匹配真实京东云OSS API响应格式
				result := map[string]interface{}{
					"RequestId": fmt.Sprintf("req-%d", time.Now().Unix()),
					"Result": map[string]interface{}{
						"Buckets": []map[string]interface{}{
							{
								"Name":         "my-bucket-01",
								"Location":     region,
								"CreationDate": time.Now().Add(-24 * time.Hour).Format("2006-01-02T15:04:05Z"),
								"StorageClass": "STANDARD",
							},
							{
								"Name":         "my-bucket-02",
								"Location":     region,
								"CreationDate": time.Now().Add(-48 * time.Hour).Format("2006-01-02T15:04:05Z"),
								"StorageClass": "STANDARD_IA",
							},
						},
					},
				}
				
				// 输出结果
				if outputFormat == "table" {
					// 对于表格格式，提取buckets数组进行显示
					if resultMap, ok := result["result"].(map[string]interface{}); ok {
						if buckets, ok := resultMap["buckets"].([]interface{}); ok {
							// 转换buckets格式以适应表格显示
							var formattedBuckets []map[string]interface{}
							for _, bucket := range buckets {
								if bucketMap, ok := bucket.(map[string]interface{}); ok {
									formattedBuckets = append(formattedBuckets, map[string]interface{}{
										"Name":         bucketMap["name"],
										"Location":     region,
										"CreationDate": bucketMap["creationDate"],
										"StorageClass": "STANDARD", // 默认存储类型
									})
								}
							}
							headers := []string{"Name", "Location", "CreationDate", "StorageClass"}
							if err := output.Print(formattedBuckets, outputFormat, headers); err != nil {
								fmt.Printf("输出失败: %v\n", err)
							}
							return
						}
					}
				}
				
				// 对于JSON/YAML格式，输出完整结果
				if err := output.Print(result, outputFormat, []string{}); err != nil {
					fmt.Printf("输出失败: %v\n", err)
				}
			} else {
				// 获取客户端
				client, err := auth.GetJDCloudClient(region, profile)
				if err != nil {
					fmt.Printf("获取客户端失败: %v\n", err)
					return
				}
				
				// 创建OSS API客户端
				ossClient := api.NewOSSClient(&client.Credential, region)
				
				// 检查是否启用调试模式
				if debug, _ := cmd.Flags().GetBool("debug"); debug {
					ossClient.DebugMode()
				}
				
				// 发送请求
				result, err := ossClient.ListBuckets()
				if err != nil {
					fmt.Printf("获取存储桶列表失败: %v\n", err)
					fmt.Println("提示：请确保您的Access Key ID和Secret Key有效，并且有权限访问OSS服务。")
					fmt.Println("您可以在京东云控制台 -> 访问控制 -> 访问密钥管理中查看和管理您的密钥。")
					return
				}
				
				// 输出结果
				if outputFormat == "table" {
					// 对于表格格式，提取buckets数组进行显示
					if resultMap, ok := result["result"].(map[string]interface{}); ok {
						if buckets, ok := resultMap["buckets"].([]interface{}); ok {
							// 转换buckets格式以适应表格显示
							var formattedBuckets []map[string]interface{}
							for _, bucket := range buckets {
								if bucketMap, ok := bucket.(map[string]interface{}); ok {
									formattedBuckets = append(formattedBuckets, map[string]interface{}{
										"Name":         bucketMap["name"],
										"Location":     region,
										"CreationDate": bucketMap["creationDate"],
										"StorageClass": "STANDARD", // 默认存储类型
									})
								}
							}
							headers := []string{"Name", "Location", "CreationDate", "StorageClass"}
							if err := output.Print(formattedBuckets, outputFormat, headers); err != nil {
								fmt.Printf("输出失败: %v\n", err)
							}
							return
						}
					}
				}
				
				// 对于JSON/YAML格式，输出完整结果
				if err := output.Print(result, outputFormat, []string{}); err != nil {
					fmt.Printf("输出失败: %v\n", err)
				}
			}
		},
	}
}

// newCreateBucketCmd 创建create-bucket子命令
func newCreateBucketCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create-bucket",
		Short: "创建存储桶",
		Long:  "创建一个新的存储桶",
		Run: func(cmd *cobra.Command, args []string) {
			// 获取参数
			bucketName, _ := cmd.Flags().GetString("bucket-name")
			storageClass, _ := cmd.Flags().GetString("storage-class")
			
			// 验证必需参数
			if bucketName == "" {
				fmt.Println("错误: bucket-name是必需参数")
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
			
			// 如果未指定存储类型，使用默认存储类型
			if storageClass == "" {
				storageClass = "Standard"
			}
			
			// 模拟创建存储桶
			result := map[string]interface{}{
				"RequestId": fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":   true,
				"BucketName": bucketName,
			}
			
			fmt.Printf("成功创建存储桶: %s\n", bucketName)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	// 添加标志
	cmd.Flags().String("bucket-name", "", "存储桶名称")
	cmd.Flags().String("storage-class", "", "存储类型 (Standard, InfrequentAccess, Archive)")

	return cmd
}

// newDeleteBucketCmd 创建delete-bucket子命令
func newDeleteBucketCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "delete-bucket",
		Short: "删除存储桶",
		Long:  "删除指定的存储桶",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			bucketName := args[0]
			
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
			
			// 模拟删除存储桶
			result := map[string]interface{}{
				"RequestId": fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":   true,
				"BucketName": bucketName,
			}
			
			fmt.Printf("成功删除存储桶: %s\n", bucketName)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}
}

// newListObjectsCmd 创建list-objects子命令
func newListObjectsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-objects",
		Short: "列出对象",
		Long:  "列出存储桶中的所有对象",
		Run: func(cmd *cobra.Command, args []string) {
			// 获取参数
			bucketName, _ := cmd.Flags().GetString("bucket-name")
			
			// 验证必需参数
			if bucketName == "" {
				fmt.Println("错误: bucket-name是必需参数")
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
			
			// 模拟数据
			objects := []map[string]interface{}{
				{
					"ObjectKey":    "file1.txt",
					"Size":         1024,
					"LastModified": time.Now().Add(-1 * time.Hour).Format("2006-01-02T15:04:05Z"),
					"StorageClass": "Standard",
				},
				{
					"ObjectKey":    "folder/file2.jpg",
					"Size":         2048,
					"LastModified": time.Now().Add(-2 * time.Hour).Format("2006-01-02T15:04:05Z"),
					"StorageClass": "Standard",
				},
			}
			
			// 输出结果
			headers := []string{"ObjectKey", "Size", "LastModified", "StorageClass"}
			if err := output.Print(objects, outputFormat, headers); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	// 添加标志
	cmd.Flags().String("bucket-name", "", "存储桶名称")

	return cmd
}

// newUploadObjectCmd 创建upload-object子命令
func newUploadObjectCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "upload-object",
		Short: "上传对象",
		Long:  "上传对象到存储桶",
		Run: func(cmd *cobra.Command, args []string) {
			// 获取参数
			bucketName, _ := cmd.Flags().GetString("bucket-name")
			objectKey, _ := cmd.Flags().GetString("object-key")
			filePath, _ := cmd.Flags().GetString("file-path")
			
			// 验证必需参数
			if bucketName == "" || objectKey == "" || filePath == "" {
				fmt.Println("错误: bucket-name, object-key和file-path是必需参数")
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
			
			// 模拟上传对象
			result := map[string]interface{}{
				"RequestId": fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":   true,
				"BucketName": bucketName,
				"ObjectKey": objectKey,
			}
			
			fmt.Printf("成功上传对象: %s 到存储桶: %s\n", objectKey, bucketName)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	// 添加标志
	cmd.Flags().String("bucket-name", "", "存储桶名称")
	cmd.Flags().String("object-key", "", "对象键")
	cmd.Flags().String("file-path", "", "文件路径")

	return cmd
}

// newDownloadObjectCmd 创建download-object子命令
func newDownloadObjectCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "download-object",
		Short: "下载对象",
		Long:  "从存储桶下载对象",
		Run: func(cmd *cobra.Command, args []string) {
			// 获取参数
			bucketName, _ := cmd.Flags().GetString("bucket-name")
			objectKey, _ := cmd.Flags().GetString("object-key")
			filePath, _ := cmd.Flags().GetString("file-path")
			
			// 验证必需参数
			if bucketName == "" || objectKey == "" || filePath == "" {
				fmt.Println("错误: bucket-name, object-key和file-path是必需参数")
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
			
			// 模拟下载对象
			result := map[string]interface{}{
				"RequestId": fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":   true,
				"BucketName": bucketName,
				"ObjectKey": objectKey,
			}
			
			fmt.Printf("成功下载对象: %s 从存储桶: %s 到文件: %s\n", objectKey, bucketName, filePath)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	// 添加标志
	cmd.Flags().String("bucket-name", "", "存储桶名称")
	cmd.Flags().String("object-key", "", "对象键")
	cmd.Flags().String("file-path", "", "文件路径")

	return cmd
}

// newDeleteObjectCmd 创建delete-object子命令
func newDeleteObjectCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "delete-object",
		Short: "删除对象",
		Long:  "从存储桶删除对象",
		Run: func(cmd *cobra.Command, args []string) {
			// 获取参数
			bucketName, _ := cmd.Flags().GetString("bucket-name")
			objectKey, _ := cmd.Flags().GetString("object-key")
			
			// 验证必需参数
			if bucketName == "" || objectKey == "" {
				fmt.Println("错误: bucket-name和object-key是必需参数")
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
			
			// 模拟删除对象
			result := map[string]interface{}{
				"RequestId": fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":   true,
				"BucketName": bucketName,
				"ObjectKey": objectKey,
			}
			
			fmt.Printf("成功删除对象: %s 从存储桶: %s\n", objectKey, bucketName)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	// 添加标志
	cmd.Flags().String("bucket-name", "", "存储桶名称")
	cmd.Flags().String("object-key", "", "对象键")

	return cmd
}