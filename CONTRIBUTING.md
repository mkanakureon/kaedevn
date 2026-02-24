# Contributing to kaedevn

Thank you for your interest in contributing to kaedevn!

## Development Setup

```bash
git clone https://github.com/mkanakureon/kaedevn.git
cd kaedevn
npm install
npm run build
npm test
```

### Project Structure

```
packages/
  interpreter/  — .ksc script interpreter
```

### Useful Commands

```bash
npm run build          # Build
npm test               # Run all tests
npm run typecheck      # Type-check
npm run demo           # Run console demo
```

## Making Changes

1. Fork the repository and create a feature branch from `main`
2. Make your changes with clear, descriptive commits
3. Add or update tests for any new functionality
4. Ensure all tests pass: `npm test`
5. Submit a pull request

## Coding Standards

- **Language**: TypeScript (strict mode)
- **Module system**: ESM (`"type": "module"`)
- **Code identifiers**: English

## Security Vulnerabilities

Please see [SECURITY.md](./SECURITY.md) for reporting security issues.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
