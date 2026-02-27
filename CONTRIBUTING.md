# Contributing to JDCloud CLI

Thank you for your interest in contributing to JDCloud CLI! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Go 1.21 or higher
- Git
- Make

### Setting Up Development Environment
```bash
# Clone the repository
git clone https://github.com/dannamax/cloud.git
cd cloud
git checkout jdcloud-cli

# Build the project
make build

# Run tests
make test
```

## 📝 Contribution Guidelines

### Types of Contributions
- **Bug Reports**: Help us identify and fix issues
- **Feature Requests**: Suggest new functionality
- **Code Contributions**: Submit improvements or new features
- **Documentation**: Improve guides, examples, or API documentation
- **Testing**: Help improve test coverage

### Reporting Issues
When reporting bugs or requesting features, please use our [GitHub Issues](https://github.com/dannamax/cloud/issues) page and include:

- Clear description of the issue
- Steps to reproduce (for bugs)
- Expected vs. actual behavior
- Environment details (OS, Go version, etc.)
- Screenshots or logs if applicable

### Code Style Guidelines

#### Go Code Style
- Follow [Effective Go](https://golang.org/doc/effective_go.html) guidelines
- Use `gofmt` for formatting
- Follow naming conventions:
  - Exported names use PascalCase
  - Private names use camelCase
  - Constants use UPPER_CASE
- Write meaningful comments for exported functions and types

#### Commit Messages
Use clear, descriptive commit messages following this format:
```
<type>: <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat: add support for RDS database management
fix: resolve authentication issue in mock mode
docs: update installation instructions
```

## 🔄 Development Workflow

### Branch Strategy
- `master`: Stable, production-ready code
- `jdcloud-cli`: Main development branch
- `feature/*`: Feature development branches
- `bugfix/*`: Bug fix branches

### Making Changes
1. Create a new branch from `jdcloud-cli`:
   ```bash
   git checkout jdcloud-cli
   git pull origin jdcloud-cli
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the code style guidelines

3. Write or update tests as necessary

4. Run tests to ensure everything works:
   ```bash
   make test
   ```

5. Commit your changes with a descriptive message

6. Push to your fork and create a pull request

### Pull Request Process
1. Ensure your PR has a clear title and description
2. Reference any related issues
3. Include tests for new functionality
4. Update documentation if needed
5. Ensure all tests pass
6. Request review from maintainers

## 🧪 Testing

### Running Tests
```bash
# Run all tests
make test

# Run tests with coverage
make test-coverage

# Run specific test
go test ./internal/command/vm/...
```

### Writing Tests
- Write unit tests for all new functionality
- Use table-driven tests where appropriate
- Mock external dependencies
- Test both success and error cases
- Aim for high test coverage

## 📖 Documentation

### Code Documentation
- Document all exported functions and types
- Include examples in documentation when helpful
- Keep documentation updated with code changes

### User Documentation
- Update README.md for significant changes
- Add examples to docs/examples.md
- Update command help text
- Keep installation and usage instructions current

## 🏷️ Release Process

### Versioning
We follow [Semantic Versioning](https://semver.org/):
- MAJOR: Incompatible API changes
- MINOR: Backward-compatible functionality
- PATCH: Backward-compatible bug fixes

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in relevant files
- [ ] Release notes prepared
- [ ] Tag created
- [ ] GitHub release published

## 🤝 Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inclusive environment for all contributors.

### Our Standards
- Be respectful and considerate
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Respect different viewpoints and experiences
- Prioritize community benefit over individual gain

### Unacceptable Behavior
- Harassment, discrimination, or hate speech
- Trolling, insulting comments, or personal attacks
- Public or private harassment
- Publishing others' private information without consent

## 💬 Getting Help

- **Documentation**: Check [docs/](docs/) for guides and examples
- **Issues**: Search existing [GitHub Issues](https://github.com/dannamax/cloud/issues)
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Chat**: [Join our community chat](#) (coming soon)

## 🙏 Recognition

Contributors will be recognized in our README and release notes. We appreciate all contributions, from small bug fixes to major features!

---

Thank you for helping make JDCloud CLI better for everyone! 🚀