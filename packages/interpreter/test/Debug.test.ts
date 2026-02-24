import { describe, it, expect, beforeEach } from "vitest";
import { Interpreter } from "../src/core/Interpreter.js";
import { Debugger, DebugEventType } from "../src/debug/Debugger.js";

// Mock Engine
class MockEngine {
  async showDialogue() {}
  async setBg() {}
  async showChar() {}
  async hideChar() {}
  async moveChar() {}
  playBgm() {}
  stopBgm() {}
  async fadeBgm() {}
  playSe() {}
  async playTimeline() {}
  async showChoice() {
    return 0;
  }
  async waitForClick() {}
  async wait() {}
}

describe("Phase 7-2: Debug Mode", () => {
  let interpreter: Interpreter;
  let engine: MockEngine;
  let dbg: Debugger;

  beforeEach(() => {
    engine = new MockEngine();
    interpreter = new Interpreter(engine, { debug: true });
    dbg = interpreter.getDebugger();
  });

  describe("変数ウォッチ機能", () => {
    it("変数の変更を記録できる", async () => {
      dbg.watchVariable("score");

      const script = `
score = 100
score += 50
score -= 20
`;

      await interpreter.run(script);

      const history = dbg.getVariableHistory("score");
      expect(history.length).toBe(3);

      expect(history[0].oldValue).toBeUndefined();
      expect(history[0].newValue).toBe(100);

      expect(history[1].oldValue).toBe(100);
      expect(history[1].newValue).toBe(150);

      expect(history[2].oldValue).toBe(150);
      expect(history[2].newValue).toBe(130);
    });

    it("複数の変数を同時に監視できる", async () => {
      dbg.watchVariable("x");
      dbg.watchVariable("y");

      const script = `
x = 10
y = 20
x += 5
y *= 2
`;

      await interpreter.run(script);

      const xHistory = dbg.getVariableHistory("x");
      const yHistory = dbg.getVariableHistory("y");

      expect(xHistory.length).toBe(2);
      expect(yHistory.length).toBe(2);

      expect(xHistory[1].newValue).toBe(15);
      expect(yHistory[1].newValue).toBe(40);
    });

    it("監視していない変数は記録されない", async () => {
      dbg.watchVariable("x");

      const script = `
x = 10
y = 20
`;

      await interpreter.run(script);

      const xHistory = dbg.getVariableHistory("x");
      const yHistory = dbg.getVariableHistory("y");

      expect(xHistory.length).toBe(1);
      expect(yHistory.length).toBe(0);
    });
  });

  describe("ブレークポイント機能", () => {
    it("ブレークポイントを設定できる", () => {
      dbg.addBreakpoint(3);
      dbg.addBreakpoint(5);

      const breakpoints = dbg.getBreakpoints();
      expect(breakpoints.length).toBe(2);
      expect(breakpoints.find((bp) => bp.line === 3)).toBeDefined();
      expect(breakpoints.find((bp) => bp.line === 5)).toBeDefined();
    });

    it("ブレークポイントを削除できる", () => {
      dbg.addBreakpoint(3);
      dbg.addBreakpoint(5);
      dbg.removeBreakpoint(3);

      const breakpoints = dbg.getBreakpoints();
      expect(breakpoints.length).toBe(1);
      expect(breakpoints.find((bp) => bp.line === 5)).toBeDefined();
    });

    it("ブレークポイントを有効/無効にできる", () => {
      dbg.addBreakpoint(3);
      dbg.toggleBreakpoint(3, false);

      const breakpoints = dbg.getBreakpoints();
      const bp = breakpoints.find((bp) => bp.line === 3);
      expect(bp?.enabled).toBe(false);

      dbg.toggleBreakpoint(3, true);
      const bp2 = dbg.getBreakpoints().find((bp) => bp.line === 3);
      expect(bp2?.enabled).toBe(true);
    });
  });

  describe("トレースログ機能", () => {
    it("関数呼び出しと戻りを記録できる", async () => {
      dbg.enableTrace();

      const script = `
def add(a, b) {
  return a + b
}

result = add(2, 3)
`;

      await interpreter.run(script);

      const traceLog = dbg.getTraceLog();
      const callLog = traceLog.find((log) => log.includes("call add"));
      const returnLog = traceLog.find((log) => log.includes("add() returned"));

      expect(callLog).toBeDefined();
      expect(callLog).toContain("call add(2, 3)");
      expect(returnLog).toBeDefined();
      expect(returnLog).toContain("returned 5");
    });

    it("変数変更を記録できる", async () => {
      dbg.enableTrace();
      dbg.watchVariable("x");

      const script = `
x = 10
x += 5
`;

      await interpreter.run(script);

      const traceLog = dbg.getTraceLog();
      const changes = traceLog.filter((log) => log.includes("x changed"));

      expect(changes.length).toBeGreaterThanOrEqual(2);
    });

    it("トレースログをクリアできる", async () => {
      dbg.enableTrace();
      dbg.watchVariable("x"); // 変数を監視してトレースに記録

      const script = `
x = 10
`;

      await interpreter.run(script);

      expect(dbg.getTraceLog().length).toBeGreaterThan(0);

      dbg.clearTraceLog();
      expect(dbg.getTraceLog().length).toBe(0);
    });
  });

  describe("イベントリスナー", () => {
    it("変数変更イベントを受け取れる", async () => {
      let eventReceived = false;
      let eventData: any = null;

      dbg.watchVariable("score");
      dbg.addEventListener((event) => {
        if (event.type === DebugEventType.VariableChanged) {
          eventReceived = true;
          eventData = event.data;
        }
      });

      const script = `
score = 100
`;

      await interpreter.run(script);

      expect(eventReceived).toBe(true);
      expect(eventData.name).toBe("score");
      expect(eventData.newValue).toBe(100);
    });

    it("関数呼び出しイベントを受け取れる", async () => {
      let callEventReceived = false;
      let returnEventReceived = false;

      dbg.addEventListener((event) => {
        if (event.type === DebugEventType.FunctionCall) {
          callEventReceived = true;
        }
        if (event.type === DebugEventType.FunctionReturn) {
          returnEventReceived = true;
        }
      });

      const script = `
def test() {
  return 42
}

result = test()
`;

      await interpreter.run(script);

      expect(callEventReceived).toBe(true);
      expect(returnEventReceived).toBe(true);
    });
  });

  describe("デバッガー制御", () => {
    it("デバッガーを有効/無効にできる", () => {
      expect(dbg.isEnabled()).toBe(true);

      dbg.disable();
      expect(dbg.isEnabled()).toBe(false);

      dbg.enable();
      expect(dbg.isEnabled()).toBe(true);
    });

    it("無効時は変数変更を記録しない", async () => {
      dbg.watchVariable("x");
      dbg.disable();

      const script = `
x = 10
`;

      await interpreter.run(script);

      const history = dbg.getVariableHistory("x");
      expect(history.length).toBe(0);
    });
  });
});
