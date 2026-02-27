package utils

import (
	"fmt"
	"strings"
	"time"
)

// WaitForCondition 等待条件满足
func WaitForCondition(condition func() (bool, error), timeout, interval time.Duration) error {
	start := time.Now()
	
	for {
		// 检查是否超时
		if time.Since(start) > timeout {
			return fmt.Errorf("等待超时")
		}
		
		// 检查条件
		ok, err := condition()
		if err != nil {
			return err
		}
		
		if ok {
			return nil
		}
		
		// 等待间隔时间
		time.Sleep(interval)
	}
}

// ParseInstanceIDs 解析实例ID列表
func ParseInstanceIDs(ids string) []string {
	if ids == "" {
		return []string{}
	}
	
	// 支持逗号分隔的ID列表
	idList := strings.Split(ids, ",")
	
	// 去除空格
	for i, id := range idList {
		idList[i] = strings.TrimSpace(id)
	}
	
	return idList
}

// FormatTime 格式化时间
func FormatTime(t time.Time) string {
	return t.Format("2006-01-02 15:04:05")
}

// FormatDuration 格式化持续时间
func FormatDuration(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%.1fs", d.Seconds())
	} else if d < time.Hour {
		return fmt.Sprintf("%.1fm", d.Minutes())
	} else {
		return fmt.Sprintf("%.1fh", d.Hours())
	}
}

// IsValidRegion 检查区域是否有效
func IsValidRegion(region string) bool {
	validRegions := []string{
		"cn-north-1",
		"cn-east-1",
		"cn-south-1",
		"cn-southwest-1",
		"cn-northeast-1",
	}
	
	for _, r := range validRegions {
		if r == region {
			return true
		}
	}
	
	return false
}

// GetRegionName 获取区域名称
func GetRegionName(region string) string {
	regionMap := map[string]string{
		"cn-north-1":     "华北-北京",
		"cn-east-1":      "华东-上海",
		"cn-south-1":     "华南-广州",
		"cn-southwest-1": "西南-成都",
		"cn-northeast-1": "东北-沈阳",
	}
	
	if name, ok := regionMap[region]; ok {
		return name
	}
	
	return region
}

// FormatSize 格式化存储大小
func FormatSize(bytes int64) string {
	const (
		KB = 1024
		MB = KB * 1024
		GB = MB * 1024
		TB = GB * 1024
	)
	
	switch {
	case bytes >= TB:
		return fmt.Sprintf("%.2f TB", float64(bytes)/TB)
	case bytes >= GB:
		return fmt.Sprintf("%.2f GB", float64(bytes)/GB)
	case bytes >= MB:
		return fmt.Sprintf("%.2f MB", float64(bytes)/MB)
	case bytes >= KB:
		return fmt.Sprintf("%.2f KB", float64(bytes)/KB)
	default:
		return fmt.Sprintf("%d B", bytes)
	}
}

// ContainsString 检查字符串是否在切片中
func ContainsString(slice []string, s string) bool {
	for _, item := range slice {
		if item == s {
			return true
		}
	}
	return false
}

// RemoveDuplicates 移除切片中的重复元素
func RemoveDuplicates(slice []string) []string {
	seen := make(map[string]bool)
	result := []string{}
	
	for _, item := range slice {
		if !seen[item] {
			seen[item] = true
			result = append(result, item)
		}
	}
	
	return result
}

// TruncateString 截断字符串
func TruncateString(s string, maxLength int) string {
	if len(s) <= maxLength {
		return s
	}
	
	return s[:maxLength-3] + "..."
}

// PadString 填充字符串
func PadString(s string, length int, padChar rune) string {
	if len(s) >= length {
		return s
	}
	
	padding := strings.Repeat(string(padChar), length-len(s))
	return s + padding
}