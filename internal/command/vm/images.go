package vm

import (
	"fmt"
	"strings"
	"time"

	"github.com/jdcloud/jdcloud-cli/internal/output"
	"github.com/spf13/cobra"
)

// AddImageCommands 添加镜像相关命令
func AddImageCommands(cmd *cobra.Command) {
	cmd.AddCommand(newDescribeImagesCmd())
	cmd.AddCommand(newCreateImageCmd())
	cmd.AddCommand(newDeleteImageCmd())
}

// newDescribeImagesCmd 创建describe-images子命令
func newDescribeImagesCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "describe-images",
		Short: "查询镜像列表",
		Long:  "查询可用的镜像列表，包括公共镜像和自定义镜像",
		Run: func(cmd *cobra.Command, args []string) {
			// 获取参数
			imageType, _ := cmd.Flags().GetString("image-type")
			platform, _ := cmd.Flags().GetString("platform")
			region, _ := cmd.Flags().GetString("region")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 如果未指定区域，使用配置中的默认区域
			if region == "" {
				region = "cn-north-1"
			}
			
			// 模拟镜像数据
			images := []map[string]interface{}{
				{
					"ImageId":     "img-dmg3ogv3yb",
					"Name":        "CentOS 7.9 64位",
					"Platform":    "CentOS",
					"OsType":      "linux",
					"Architecture": "x86_64",
					"ImageSource": "public",
					"Status":      "available",
					"CreateTime":  "2023-01-01T00:00:00Z",
					"SizeGB":      20,
				},
				{
					"ImageId":     "img-679tfy8yi3",
					"Name":        "Ubuntu 20.04 LTS 64位",
					"Platform":    "Ubuntu",
					"OsType":      "linux",
					"Architecture": "x86_64",
					"ImageSource": "public",
					"Status":      "available",
					"CreateTime":  "2023-01-01T00:00:00Z",
					"SizeGB":      20,
				},
				{
					"ImageId":     "img-custom-12345678",
					"Name":        "My Custom Image",
					"Platform":    "CentOS",
					"OsType":      "linux",
					"Architecture": "x86_64",
					"ImageSource": "private",
					"Status":      "available",
					"CreateTime":  time.Now().Add(-24 * time.Hour).Format("2006-01-02T15:04:05Z"),
					"SizeGB":      50,
				},
			}
			
			// 应用过滤条件
			filteredImages := []map[string]interface{}{}
			for _, image := range images {
				// 过滤镜像类型
				if imageType != "" && image["ImageSource"].(string) != imageType {
					continue
				}
				// 过滤平台
				if platform != "" && !strings.Contains(strings.ToLower(image["Platform"].(string)), strings.ToLower(platform)) {
					continue
				}
				filteredImages = append(filteredImages, image)
			}
			
			// 输出结果
			if outputFormat == "table" {
				headers := []string{"ImageId", "Name", "Platform", "OsType", "Architecture", "ImageSource", "Status", "SizeGB"}
				if err := output.Print(filteredImages, outputFormat, headers); err != nil {
					fmt.Printf("输出失败: %v\n", err)
				}
			} else {
				result := map[string]interface{}{
					"RequestId": fmt.Sprintf("req-%d", time.Now().Unix()),
					"Success":   true,
					"Images":    filteredImages,
				}
				if err := output.Print(result, outputFormat, []string{}); err != nil {
					fmt.Printf("输出失败: %v\n", err)
				}
			}
		},
	}

	// 添加标志
	cmd.Flags().String("image-type", "", "镜像类型 (public/private)")
	cmd.Flags().String("platform", "", "平台类型 (CentOS, Ubuntu, Windows等)")

	return cmd
}

// newCreateImageCmd 创建create-image子命令
func newCreateImageCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create-image",
		Short: "创建自定义镜像",
		Long:  "基于云主机实例创建自定义镜像",
		Run: func(cmd *cobra.Command, args []string) {
			// 获取参数
			instanceID, _ := cmd.Flags().GetString("instance-id")
			imageName, _ := cmd.Flags().GetString("image-name")
			_, _ = cmd.Flags().GetString("description")
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 验证必需参数
			if instanceID == "" || imageName == "" {
				fmt.Println("错误: instance-id和image-name是必需参数")
				return
			}
			
			// 模拟创建镜像
			imageID := "img-custom-" + fmt.Sprintf("%08d", time.Now().Unix())
			
			result := map[string]interface{}{
				"RequestId": fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":   true,
				"ImageId":   imageID,
				"ImageName": imageName,
			}
			
			fmt.Printf("成功创建自定义镜像: %s (%s)\n", imageName, imageID)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}

	// 添加标志
	cmd.Flags().String("instance-id", "", "源实例ID (必需)")
	cmd.Flags().String("image-name", "", "镜像名称 (必需)")
	cmd.Flags().String("description", "", "镜像描述")

	return cmd
}

// newDeleteImageCmd 创建delete-image子命令
func newDeleteImageCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "delete-image",
		Short: "删除自定义镜像",
		Long:  "删除自定义镜像",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			imageID := args[0]
			
			// 获取参数
			outputFormat, _ := cmd.Flags().GetString("output")
			
			// 模拟删除镜像
			result := map[string]interface{}{
				"RequestId": fmt.Sprintf("req-%d", time.Now().Unix()),
				"Success":   true,
				"ImageId":   imageID,
			}
			
			fmt.Printf("成功删除自定义镜像: %s\n", imageID)
			
			// 输出结果
			if err := output.Print(result, outputFormat, []string{}); err != nil {
				fmt.Printf("输出失败: %v\n", err)
			}
		},
	}
}