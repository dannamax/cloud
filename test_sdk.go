package main

import (
	"fmt"
	"github.com/jdcloud-api/jdcloud-sdk-go/core"
)

func main() {
	// 创建凭证
	credential := &core.Credential{
		AccessKey: "your-access-key",
		SecretKey: "your-secret-key",
	}
	
	// 创建客户端
	client := core.NewJDCloudClient(credential)
	
	fmt.Println("Client created successfully")
}