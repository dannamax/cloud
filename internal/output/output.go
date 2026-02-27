package output

import (
	"encoding/json"
	"fmt"
	"os"
	"text/tabwriter"

	"gopkg.in/yaml.v2"
)

// OutputFormatter 输出格式化器接口
type OutputFormatter interface {
	Format(data interface{}) error
}

// JSONFormatter JSON格式化器
type JSONFormatter struct{}

// Format 将数据格式化为JSON
func (f *JSONFormatter) Format(data interface{}) error {
	output, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	fmt.Println(string(output))
	return nil
}

// YAMLFormatter YAML格式化器
type YAMLFormatter struct{}

// Format 将数据格式化为YAML
func (f *YAMLFormatter) Format(data interface{}) error {
	output, err := yaml.Marshal(data)
	if err != nil {
		return err
	}
	fmt.Print(string(output))
	return nil
}

// TableFormatter 表格格式化器
type TableFormatter struct {
	Headers []string
}

// Format 将数据格式化为表格
func (f *TableFormatter) Format(data interface{}) error {
	tableData, ok := data.([]map[string]interface{})
	if !ok {
		return fmt.Errorf("表格格式化器需要[]map[string]interface{}类型的数据")
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	
	// 打印表头
	headerStr := ""
	for i, header := range f.Headers {
		if i > 0 {
			headerStr += "\t"
		}
		headerStr += header
	}
	fmt.Fprintln(w, headerStr)
	
	// 打印分隔线
	separator := ""
	for i := range f.Headers {
		if i > 0 {
			separator += "\t"
		}
		separator += "--------"
	}
	fmt.Fprintln(w, separator)
	
	// 打印数据行
	for _, row := range tableData {
		rowStr := ""
		for i, header := range f.Headers {
			if i > 0 {
				rowStr += "\t"
			}
			if val, ok := row[header]; ok {
				rowStr += fmt.Sprintf("%v", val)
			} else {
				rowStr += "-"
			}
		}
		fmt.Fprintln(w, rowStr)
	}
	
	w.Flush()
	return nil
}

// GetFormatter 根据格式获取对应的格式化器
func GetFormatter(format string, headers []string) OutputFormatter {
	switch format {
	case "json":
		return &JSONFormatter{}
	case "yaml":
		return &YAMLFormatter{}
	case "table":
		return &TableFormatter{Headers: headers}
	default:
		return &JSONFormatter{}
	}
}

// Print 打印数据
func Print(data interface{}, format string, headers []string) error {
	formatter := GetFormatter(format, headers)
	return formatter.Format(data)
}