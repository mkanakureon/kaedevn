# kaedevn

Visual novel engine with .ksc (Kaede Script) interpreter.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@kaedevn/interpreter`](./packages/interpreter) | 0.1.0 | .ksc script interpreter |

## Quick Start

```bash
npm install
npm run build
npm run demo
```

## .ksc Script Example

```ksc
bg("school_day")
ch("hero", "smile", "center")

#hero
Hello! Welcome to our school.
#

choice {
  "Nice to meet you!" {
    affection += 2
    jump("happy_path")
  }
  "..." {
    jump("quiet_path")
  }
}
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

MIT
