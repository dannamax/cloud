.PHONY: build test clean install fmt vet

# 版本信息
VERSION ?= $(shell git describe --tags --always --dirty)
COMMIT ?= $(shell git rev-parse HEAD)
DATE ?= $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

# 构建信息
LDFLAGS := -X 'main.version=$(VERSION)' -X 'main.commit=$(COMMIT)' -X 'main.date=$(DATE)'

# 目标平台
PLATFORMS := linux/amd64 linux/arm64 darwin/amd64 darwin/arm64 windows/amd64

# 默认目标
default: build

# 构建
build:
	go build -ldflags "$(LDFLAGS)" -o bin/jdcloud ./cmd/jdcloud

# 安装
install:
	go install -ldflags "$(LDFLAGS)" ./cmd/jdcloud

# 运行测试
test:
	go test -v ./...

# 格式化代码
fmt:
	go fmt ./...

# 代码检查
vet:
	go vet ./...

# 清理构建文件
clean:
	rm -rf bin/

# 为所有平台构建
build-all:
	@for platform in $(PLATFORMS); do \
		os=$$(echo $$platform | cut -d'/' -f1); \
		arch=$$(echo $$platform | cut -d'/' -f2); \
		output_name="bin/jdcloud-$$os-$$arch"; \
		if [ $$os = "windows" ]; then \
			output_name="$$output_name.exe"; \
		fi; \
		echo "Building for $$os/$$arch..."; \
		GOOS=$$os GOARCH=$$arch go build -ldflags "$(LDFLAGS)" -o $$output_name ./cmd/jdcloud; \
	done

# 打包发布
release: build-all
	cd bin && \
	tar -czf jdcloud-cli-linux-amd64.tar.gz jdcloud-linux-amd64 && \
	tar -czf jdcloud-cli-linux-arm64.tar.gz jdcloud-linux-arm64 && \
	tar -czf jdcloud-cli-darwin-amd64.tar.gz jdcloud-darwin-amd64 && \
	tar -czf jdcloud-cli-darwin-arm64.tar.gz jdcloud-darwin-arm64 && \
	zip jdcloud-cli-windows-amd64.zip jdcloud-windows-amd64.exe

# 帮助
help:
	@echo "Available targets:"
	@echo "  build     - 构建当前平台的二进制文件"
	@echo "  install   - 安装到GOPATH/bin"
	@echo "  test      - 运行测试"
	@echo "  fmt       - 格式化代码"
	@echo "  vet       - 代码检查"
	@echo "  clean     - 清理构建文件"
	@echo "  build-all - 为所有平台构建"
	@echo "  release   - 打包发布版本"
	@echo "  help      - 显示此帮助信息"