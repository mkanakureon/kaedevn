# @kaedevn/interpreter

.ksc (Kaede Script) interpreter for the kaedevn visual novel engine. Runs scripts directly without compilation.

## Install

```bash
npm install @kaedevn/interpreter
```

## Usage

```typescript
import { Interpreter } from "@kaedevn/interpreter";
import type { IEngineAPI } from "@kaedevn/interpreter";

// Implement IEngineAPI for your platform
class MyEngine implements IEngineAPI {
  async showDialogue(speaker: string, lines: string[]) { /* render dialogue */ }
  async setBg(name: string, effect?: string) { /* set background */ }
  async showChar(name: string, pose: string, position?: string) { /* show character */ }
  async hideChar(name: string) { /* hide character */ }
  async moveChar(name: string, position: string, time: number) { /* move character */ }
  playBgm(name: string) { /* play BGM */ }
  stopBgm() { /* stop BGM */ }
  async fadeBgm(time: number) { /* fade BGM */ }
  playSe(name: string) { /* play sound effect */ }
  async playTimeline(name: string) { /* play timeline */ }
  async showChoice(options: ChoiceOption[]): Promise<number> { /* show choices */ }
  async waitForClick() { /* wait for user input */ }
  async wait(ms: number) { /* timed wait */ }
}

const engine = new MyEngine();
const interpreter = new Interpreter(engine);
await interpreter.run(script);
```

## .ksc Script Syntax

### Dialogue

```ksc
#hero
Hello!
This is a visual novel engine.
#
```

### Commands

```ksc
bg("school_day")
bg("room", "fade")
ch("hero", "smile", "center")
ch_hide("hero")
bgm("daily")
bgm_stop()
se("click")
wait(500)
waitclick()
```

### Labels & Jumps

```ksc
*start
jump("chapter1")

*chapter1
call("subroutine")
ret()
```

### Variables & Conditionals

```ksc
affection = 0
affection += 1

if (affection >= 5) {
  #heroine
  You're so kind!
  #
}
```

### Choices

```ksc
choice {
  "Walk home together" {
    affection += 2
    jump("go_home")
  }
  "Go to the library" if (affection >= 3) {
    jump("library")
  }
}
```

### Functions

```ksc
def mood(aff) {
  if (aff >= 8) return "happy"
  return "normal"
}

sub greet() {
  #hero
  Hello!
  #
}

greet()
```

## Console Demo

```bash
npm run demo
```

Runs `examples/01-hello.ksc` in the terminal.

## License

MIT
