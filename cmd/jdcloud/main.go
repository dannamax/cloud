package main

import (
	"fmt"
	"os"

	"github.com/jdcloud/jdcloud-cli/internal/command"
)

var (
	version = "dev"
	commit  = "none"
	date    = "unknown"
)

func main() {
	// 显示版本信息
	if len(os.Args) > 1 && (os.Args[1] == "version" || os.Args[1] == "--version") {
		fmt.Printf("JDCloud CLI v%s\nCommit: %s\nBuilt: %s\n", version, commit, date)
		return
	}

	// 执行主命令
	if err := command.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}