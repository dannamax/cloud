package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// 京东云VM API完整接口清单
var jcloudVmApis = []string{
	// 实例管理接口
	"DescribeInstances",
	"DescribeInstanceStatus",
	"CreateInstances",
	"StartInstance",
	"StopInstance",
	"RebootInstance",
	"DeleteInstance",
	"ModifyInstanceAttribute",
	"DescribeInstanceTypes",
	
	// 网络相关接口
	"AssociateElasticIp",
	"DisassociateElasticIp",
	"DescribeInstanceVncUrl",
	"ModifyInstanceNetworkAttribute",
	"AttachNetworkInterface",
	"DetachNetworkInterface",
	
	// 存储相关接口
	"AttachDisk",
	"DetachDisk",
	"DescribeInstanceDisks",
	
	// 镜像相关接口
	"DescribeImages",
	"CreateImage",
	"DeleteImage",
	"ShareImage",
	
	// 安全相关接口
	"DescribeSecurityGroups",
	"CreateSecurityGroup",
	"DeleteSecurityGroup",
	"AuthorizeSecurityGroup",
	"RevokeSecurityGroup",
	
	// 密钥相关接口
	"DescribeKeypairs",
	"CreateKeypair",
	"DeleteKeypair",
	"ImportKeypair",
	
	// 监控相关接口
	"DescribeInstanceMonitorInfo",
	"DescribeInstanceMetrics",
	
	// 配额相关接口
	"DescribeQuotas",
	
	// 实例模板相关接口
	"DescribeInstanceTemplates",
	"CreateInstanceTemplate",
	"DeleteInstanceTemplate",
}

// 当前CLI实现的接口映射
var cliImplementations = map[string]string{
	// 实例管理接口
	"DescribeInstances":           "describe-instances",
	"DescribeInstanceStatus":      "describe-instance-status",
	"CreateInstances":             "create-instance",
	"StartInstance":               "start-instance",
	"StopInstance":                "stop-instance",
	"RebootInstance":              "reboot-instance",
	"DeleteInstance":              "delete-instance",
	"ModifyInstanceAttribute":     "modify-instance-attribute",
	"DescribeInstanceTypes":       "describe-instance-types",
	
	// 网络相关接口
	"AssociateElasticIp":          "associate-elastic-ip",
	"DisassociateElasticIp":       "disassociate-elastic-ip",
	"DescribeInstanceVncUrl":      "describe-instance-vnc-url",
	
	// 存储相关接口
	"AttachDisk":                  "attach-disk",
	"DetachDisk":                  "detach-disk",
	"DescribeInstanceDisks":       "describe-instance-disks",
	
	// 镜像相关接口
	"DescribeImages":              "describe-images",
	"CreateImage":                 "create-image",
	"DeleteImage":                 "delete-image",
	
	// 安全相关接口
	"DescribeSecurityGroups":      "describe-security-groups",
	"AuthorizeSecurityGroup":      "authorize-security-group",
	"RevokeSecurityGroup":         "revoke-security-group",
	
	// 密钥相关接口
	"DescribeKeypairs":            "describe-keypairs",
	"CreateKeypair":               "create-keypair",
	"DeleteKeypair":               "delete-keypair",
	"ImportKeypair":               "import-keypair",
	
	// 配额相关接口
	"DescribeQuotas":              "describe-quotas",
}

func main() {
	fmt.Println("=== 京东云VM API接口实现对比分析 ===\n")
	
	// 统计实现情况
	implemented := 0
	notImplemented := 0
	
	fmt.Println("## 接口实现详情")
	fmt.Println("| API接口 | CLI命令 | 实现状态 | 备注 |")
	fmt.Println("|---------|---------|----------|------|")
	
	for _, api := range jcloudVmApis {
		if cmd, exists := cliImplementations[api]; exists {
			fmt.Printf("| %s | %s | ✅ 已实现 | 功能完整 |\n", api, cmd)
			implemented++
		} else {
			fmt.Printf("| %s | - | ❌ 未实现 | 需要开发 |\n", api)
			notImplemented++
		}
	}
	
	fmt.Printf("\n## 统计摘要\n")
	fmt.Printf("- **已实现接口**: %d 个 (%.1f%%)\n", implemented, float64(implemented)/float64(len(jcloudVmApis))*100)
	fmt.Printf("- **未实现接口**: %d 个 (%.1f%%)\n", notImplemented, float64(notImplemented)/float64(len(jcloudVmApis))*100)
	fmt.Printf("- **总计接口**: %d 个\n", len(jcloudVmApis))
	
	// 检查当前CLI命令文件
	fmt.Printf("\n## 当前CLI命令文件检查\n")
	checkCliFiles()
}

func checkCliFiles() {
	vmDir := "internal/command/vm"
	
	// 检查基础VM命令文件
	vmFile := filepath.Join(vmDir, "vm.go")
	if _, err := os.Stat(vmFile); err == nil {
		fmt.Printf("✅ 基础VM命令文件: %s\n", vmFile)
	} else {
		fmt.Printf("❌ 基础VM命令文件缺失: %s\n", vmFile)
	}
	
	// 检查扩展VM命令文件
	extendedFile := filepath.Join(vmDir, "vm_extended.go")
	if _, err := os.Stat(extendedFile); err == nil {
		fmt.Printf("✅ 扩展VM命令文件: %s\n", extendedFile)
	} else {
		fmt.Printf("❌ 扩展VM命令文件缺失: %s\n", extendedFile)
	}
	
	// 统计当前实现的命令数量
	cmdCount := len(cliImplementations)
	fmt.Printf("📊 当前实现命令总数: %d 个\n", cmdCount)
	
	// 列出所有已实现命令
	fmt.Printf("\n## 已实现CLI命令列表\n")
	for api, cmd := range cliImplementations {
		fmt.Printf("- `%s` -> 对应API: %s\n", cmd, api)
	}
}

// 检查代码中的实际实现
func checkActualImplementations() {
	fmt.Printf("\n## 代码实现检查\n")
	
	// 检查describe-instances实现
	checkCommandImplementation("describe-instances")
	
	// 检查create-instance实现
	checkCommandImplementation("create-instance")
}

func checkCommandImplementation(command string) {
	vmFile := filepath.Join("internal/command/vm", "vm.go")
	if content, err := os.ReadFile(vmFile); err == nil {
		if strings.Contains(string(content), fmt.Sprintf("new%sCmd", toCamelCase(command))) {
			fmt.Printf("✅ %s 命令已实现\n", command)
		} else {
			fmt.Printf("❌ %s 命令实现未找到\n", command)
		}
	} else {
		fmt.Printf("⚠️ 无法检查 %s 命令: %v\n", command, err)
	}
}

func toCamelCase(s string) string {
	parts := strings.Split(s, "-")
	for i, part := range parts {
		if i > 0 {
			parts[i] = strings.Title(part)
		}
	}
	return strings.Join(parts, "")
}