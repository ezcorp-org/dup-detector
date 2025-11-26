# Contributing to Duplicate File Detector

Thank you for your interest in contributing to Duplicate File Detector! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Set up the development environment (see README.md for prerequisites)
4. Create a new branch for your feature or fix

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run tauri dev

# Run tests
npm run test:unit
npm run test:e2e
cd src-tauri && cargo test
```

## Code Style

### Rust (Backend)
- Follow standard Rust conventions and idioms
- Use `cargo fmt` to format code
- Use `cargo clippy` to catch common issues
- Add documentation comments for public APIs
- Write unit tests for new functionality

### TypeScript/Svelte (Frontend)
- Use TypeScript for type safety
- Follow the existing component structure
- Use Svelte stores for state management
- Write unit tests using Vitest

## Commit Messages

- Use clear, descriptive commit messages
- Start with a verb in present tense (e.g., "Add", "Fix", "Update")
- Keep the first line under 72 characters
- Reference issues when applicable (e.g., "Fix #123")

## Pull Request Process

1. Ensure all tests pass locally
2. Update documentation if needed
3. Add tests for new functionality
4. Keep PRs focused on a single feature or fix
5. Provide a clear description of the changes

## Reporting Issues

When reporting issues, please include:
- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your operating system and version
- Any relevant error messages or logs

## Code of Conduct

Please be respectful and constructive in all interactions. We're all here to build something great together.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
