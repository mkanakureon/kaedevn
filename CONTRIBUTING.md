# Using kaedevn

This repository is a reference implementation synced from a private monorepo. Pull requests are not accepted.

## How to Use

Fork this repository and adapt it to your own project.

```bash
# Fork on GitHub, then:
git clone https://github.com/YOUR_NAME/kaedevn.git
cd kaedevn
npm install
npm run build
npm test
```

## Project Structure

```
packages/
  interpreter/  — .ksc script interpreter
```

## Useful Commands

```bash
npm run build          # Build
npm test               # Run all tests
npm run typecheck      # Type-check
npm run demo           # Run console demo
```

## Coding Standards

- **Language**: TypeScript (strict mode)
- **Module system**: ESM (`"type": "module"`)
- **Code identifiers**: English

## License

MIT
