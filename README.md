# JDCloud CLI Tool

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Go Version](https://img.shields.io/badge/go-1.21%2B-blue.svg)](go.mod)

A powerful command-line interface for JDCloud services, designed to rival Alibaba Cloud CLI.

## 🌟 Features

### Core Capabilities
- ✅ Multiple authentication methods (AK, STS, role-based)
- ✅ Multi-region support
- ✅ Multiple output formats (JSON, YAML, table)
- ✅ Command auto-completion
- ✅ Configuration file management
- ✅ Polling and waiting functionality

### Cloud Services Support
- ✅ **VM (Virtual Machines)**: Create, start, stop, reboot, delete instances
- ✅ **VPC (Virtual Private Cloud)**: Manage VPCs and subnets
- ✅ **OSS (Object Storage Service)**: Manage buckets and objects
- ⏳ RDS (Relational Database Service) - Coming soon
- ⏳ SLB (Server Load Balancer) - Coming soon
- ⏳ AS (Auto Scaling) - Coming soon

### Advanced Features
- ✅ Batch operations
- ✅ Template-based deployment
- ✅ Scriptable execution
- ✅ Result filtering and querying

## 🚀 Quick Start

### Installation

```bash
# Via install script (recommended)
/bin/bash -c "$(curl -fsSL https://jdcloud-cli.jd.com/install.sh)"

# Or build from source
git clone https://github.com/dannamax/cloud.git
cd cloud
git checkout jdcloud-cli
make build
sudo cp bin/jdcloud /usr/local/bin/
```

### Configuration

```bash
# Configure credentials
jdcloud configure

# Or use environment variables
export JDCLOUD_ACCESS_KEY_ID="your-access-key-id"
export JDCLOUD_ACCESS_KEY_SECRET="your-secret-key"
export JDCLOUD_REGION_ID="cn-north-1"
```

### Usage Examples

```bash
# List VM instances
jdcloud vm describe-instances

# Create a VM instance
jdcloud vm create-instance --image-id img-xxxxx --instance-type g.n2.medium

# Manage VPC
jdcloud vpc describe-vpcs
jdcloud vpc create-vpc --vpc-name my-vpc --cidr-block 10.0.0.0/16

# Manage OSS
jdcloud oss list-buckets
jdcloud oss create-bucket --bucket-name my-bucket
```

## 🛠️ Dual Mode Support

### Real API Mode
Connects to actual JDCloud services using valid API credentials.

### Mock Mode
```bash
export JDCLOUD_MOCK_MODE=true
jdcloud vm describe-instances
```
Returns preset mock data for testing and learning purposes.

## 📚 Documentation

- [Quick Start Guide](docs/quick-start.md)
- [Authentication Configuration](docs/authentication.md)
- [Usage Examples](docs/examples.md)
- [Feature Comparison](docs/comparison.md)

## 🔧 Development

### Prerequisites
- Go 1.21 or higher
- Make

### Build
```bash
make build
```

### Test
```bash
make test
```

### Install
```bash
make install
```

## 📝 Project Structure

```
jdcloud-cli/
├── cmd/              # Command-line entry points
├── internal/         # Internal implementation
│   ├── api/          # API client implementation
│   ├── auth/         # Authentication module
│   ├── command/      # Command implementations
│   ├── config/       # Configuration management
│   ├── output/       # Output formatting
│   └── utils/        # Utility functions
├── docs/             # Documentation
├── scripts/          # Scripts for installation, testing, and release
└── bin/              # Compiled binaries
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Alibaba Cloud CLI
- Built with Go and Cobra framework
- Uses JDCloud official SDK

## 📞 Support

If you encounter any issues or have questions, please:
1. Check the [documentation](docs/)
2. Search existing [issues](https://github.com/dannamax/cloud/issues)
3. Create a new issue if needed