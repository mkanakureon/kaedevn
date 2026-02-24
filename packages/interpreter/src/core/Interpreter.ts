import type { IEngineAPI } from "../engine/IEngineAPI.js";
import { Parser } from "./Parser.js";
import { GameState } from "./GameState.js";
import { Evaluator } from "./Evaluator.js";
import { LineType } from "../types/LineType.js";
import { ErrorHandler } from "../debug/ErrorHandler.js";
import { Debugger } from "../debug/Debugger.js";
import type { CallFrame as ErrorCallFrame } from "../types/Error.js";

/**
 * KNFインタプリタ
 * .ksc (Kaede Script) を解釈・実行する
 */
export class Interpreter {
  private lines: string[] = [];
  private script: string = ""; // Phase 7: エラーコンテキスト表示用
  private pc: number = 0;
  private running: boolean = false;

  private parser: Parser;
  private evaluator: Evaluator;
  private state: GameState;
  private engine: IEngineAPI;
  private debugger: Debugger; // Phase 7-2: デバッグ機能

  constructor(engine: IEngineAPI, options?: { debug?: boolean }) {
    this.engine = engine;
    this.parser = new Parser();
    this.evaluator = new Evaluator();
    this.state = new GameState();
    this.debugger = new Debugger({ enabled: options?.debug ?? false }); // Phase 7-2

    // Phase 5完成: Evaluatorに関数呼び出しハンドラーを設定
    this.evaluator.setFunctionCallHandler(async (name, args) => {
      // ユーザー定義関数/サブルーチンを実行
      if (this.state.functions.has(name) || this.state.subroutines.has(name)) {
        return await this.executeUserFunction(name, args);
      }

      // 組み込み関数はサポートしない（式の中では呼べない）
      if (this.isBuiltinFunction(name)) {
        throw new Error(`組み込み関数 '${name}' は式の中では使用できません`);
      }

      // Phase 7: 未定義関数エラーに提案を追加
      const availableFuncs = this.getAvailableFunctions();
      const error = ErrorHandler.createFunctionNotFoundError(
        name,
        this.pc + 1,
        availableFuncs,
        this.buildErrorStack(),
        this.script
      );
      throw new Error(ErrorHandler.formatError(error));
    });
  }

  /**
   * スクリプトをロードして実行を開始
   * @param script .kscスクリプトの内容
   */
  async run(script: string): Promise<void> {
    // スクリプトを保存（Phase 7: エラーコンテキスト表示用）
    this.script = script;

    // 行分割
    this.lines = script.split("\n");
    this.pc = 0;
    this.running = true;

    // ラベルマップを構築
    this.state.labelMap = this.parser.buildLabelMap(this.lines);

    // 関数・サブルーチンマップを構築 (Phase 5)
    this.indexFunctions();

    // メインループ
    await this.mainLoop();
  }

  /**
   * 関数・サブルーチン定義をインデックス化 (Phase 5)
   */
  private indexFunctions(): void {
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i].trim();

      if (line.startsWith("def ") || line.startsWith("sub ")) {
        try {
          const funcDef = this.parser.parseFunctionDef(this.lines, i);

          // 組み込み関数名の予約語チェック (v2.1)
          if (this.isBuiltinFunction(funcDef.name)) {
            throw new Error(
              `[KNF Error] Line ${i + 1}: '${funcDef.name}' は組み込み関数名です`
            );
          }

          // 関数またはサブルーチンとして登録
          if (line.startsWith("def ")) {
            this.state.functions.set(funcDef.name, funcDef);
          } else {
            this.state.subroutines.set(funcDef.name, funcDef);
          }

          // ブロックの終了位置までスキップ
          i = this.parser.findBlockEnd(this.lines, i);
        } catch (error) {
          throw new Error(`関数定義のパースに失敗: ${error}`);
        }
      }
    }
  }

  /**
   * 実行を停止
   */
  stop(): void {
    this.running = false;
  }

  /**
   * 特定のラベルにジャンプ（Phase 2で実装）
   */
  jumpTo(label: string): void {
    const lineNum = this.state.labelMap.get(label);
    if (lineNum === undefined) {
      throw new Error(`未定義のラベル: ${label}`);
    }
    this.pc = lineNum + 1; // ラベル行の次から実行
  }

  /**
   * メインループ
   */
  private async mainLoop(): Promise<void> {
    while (this.running && this.pc < this.lines.length) {
      await this.step();
    }
  }

  /**
   * 1行実行
   */
  private async step(): Promise<void> {
    // Phase 7-2: ブレークポイントチェック
    if (this.debugger.isEnabled()) {
      const shouldBreak = await this.debugger.shouldBreak(
        this.pc + 1,
        this.state,
        async (condition, state) => {
          return await this.evaluator.evaluateCondition(condition, state);
        }
      );

      if (shouldBreak) {
        this.debugger.pause();
        // ブレークポイントで停止（実際の処理は外部で制御）
        // ここでは一時停止フラグを立てるだけ
      }
    }

    const line = this.lines[this.pc].trim();

    // 空行とコメントはスキップ
    if (line === "" || line.startsWith("//")) {
      this.pc++;
      return;
    }

    // 関数/サブルーチン定義はスキップ (Phase 5)
    if (line.startsWith("def ") || line.startsWith("sub ")) {
      const blockEnd = this.parser.findBlockEnd(this.lines, this.pc);
      this.pc = blockEnd + 1;
      return;
    }

    const lineType = this.parser.classifyLine(line);

    switch (lineType) {
      case LineType.DialogueStart:
        await this.handleDialogue(line);
        break;

      case LineType.DialogueEnd:
        // セリフ終了タグ単体は無視
        this.pc++;
        break;

      case LineType.Label:
        // ラベル定義はスキップ
        this.pc++;
        break;

      case LineType.Expression:
        await this.handleExpression(line);
        break;

      default:
        this.pc++;
        break;
    }
  }

  /**
   * セリフブロックを処理
   * Phase 6: 文字列補間に対応
   * @param line セリフ開始行 (例: "#hero")
   */
  private async handleDialogue(line: string): Promise<void> {
    const speaker = this.parser.extractSpeaker(line);
    this.pc++;

    const textLines: string[] = [];

    // セリフ終了 (#) まで収集
    while (this.pc < this.lines.length) {
      const current = this.lines[this.pc].trim();
      if (current === "#") {
        this.pc++;
        break;
      }

      // Phase 6: 文字列補間を適用 (v2.1: セリフブロック内のみ)
      try {
        const interpolated = await this.evaluator.interpolate(current, this.state);
        textLines.push(interpolated);
      } catch (error) {
        throw new Error(`[KNF Error] Line ${this.pc + 1}: ${error}`);
      }

      this.pc++;
    }

    // エンジンに表示を依頼
    await this.engine.showDialogue(speaker, textLines);
  }

  /**
   * JS式/文を処理
   * Phase 4: if文とchoiceに対応
   * Phase 5: return文とユーザー関数呼び出しに対応
   * @param line 式/文の行
   */
  private async handleExpression(line: string): Promise<void> {
    // return文のチェック (Phase 5)
    if (line.startsWith("return ") || line === "return") {
      await this.handleReturn(line);
      return;
    }

    // if文のチェック
    if (line.startsWith("if ") || line.startsWith("if(")) {
      await this.handleIf(line);
      return;
    }

    // choice構文のチェック
    if (line === "choice {" || line.startsWith("choice {")) {
      await this.handleChoice();
      return;
    }

    // Phase 5: 関数呼び出しを伴う代入をチェック（例: result = func(args)）
    const funcAssignMatch = line.match(/^(\w+)\s*=\s*(\w+)\((.*)\)$/);
    if (funcAssignMatch) {
      const [, varName, funcName, argsStr] = funcAssignMatch;

      // 引数を評価
      const args: unknown[] = [];
      if (argsStr.trim().length > 0) {
        const argExpressions = argsStr.split(",").map((a) => a.trim());
        for (const argExpr of argExpressions) {
          try {
            const value = await this.evaluator.evaluate(argExpr, this.state);
            args.push(value);
          } catch (error) {
            if (
              (argExpr.startsWith('"') && argExpr.endsWith('"')) ||
              (argExpr.startsWith("'") && argExpr.endsWith("'"))
            ) {
              args.push(argExpr.slice(1, -1));
            } else {
              throw error;
            }
          }
        }
      }

      // ユーザー関数かチェック
      if (this.state.functions.has(funcName) || this.state.subroutines.has(funcName)) {
        const result = await this.executeUserFunction(funcName, args);
        this.state.setVar(varName, result);
        this.pc++;
        return;
      }

      // 組み込み関数の場合はエラー（組み込み関数は戻り値を返さない想定）
      if (this.isBuiltinFunction(funcName)) {
        throw new Error(
          `[KNF Error] Line ${this.pc + 1}: 組み込み関数 '${funcName}' は値を返しません`
        );
      }

      // それ以外は通常の評価にフォールスルー
    }

    // 代入文かどうかチェック（=, +=, -=, *=, /= を含む）
    if (/^\w+\s*[+\-*/]?=/.test(line)) {
      try {
        // Phase 7-2: 変数変更追跡
        const varMatch = line.match(/^(\w+)\s*[+\-*/]?=/);
        const varName = varMatch ? varMatch[1] : null;
        const oldValue = varName && this.state.hasVar(varName)
          ? this.state.getVar(varName)
          : undefined;

        await this.evaluator.executeAssignment(line, this.state);

        // 変更を記録
        if (varName && this.debugger.isEnabled()) {
          const newValue = this.state.getVar(varName);
          this.debugger.recordVariableChange(
            varName,
            oldValue,
            newValue,
            this.pc + 1
          );
        }

        this.pc++;
        return;
      } catch (error) {
        throw this.enhanceEvaluatorError(error);
      }
    }

    // 関数呼び出しかどうかチェック
    const match = line.match(/^(\w+)\((.*)\)$/);
    if (match) {
      const funcName = match[1];
      const argsStr = match[2];

      // 引数を評価（Phase 3: Evaluatorを使用）
      const args: unknown[] = [];
      if (argsStr.trim().length > 0) {
        // カンマで分割（簡易実装）
        const argExpressions = argsStr.split(",").map((a) => a.trim());
        for (const argExpr of argExpressions) {
          try {
            const value = await this.evaluator.evaluate(argExpr, this.state);
            args.push(value);
          } catch (error) {
            // 評価に失敗した場合は文字列リテラルとして扱う（後方互換性）
            if ((argExpr.startsWith('"') && argExpr.endsWith('"')) ||
                (argExpr.startsWith("'") && argExpr.endsWith("'"))) {
              args.push(argExpr.slice(1, -1));
            } else {
              throw error;
            }
          }
        }
      }

      // Phase 5: ユーザー定義関数/サブルーチンを先にチェック
      if (this.state.functions.has(funcName) || this.state.subroutines.has(funcName)) {
        await this.executeUserFunction(funcName, args);
        this.pc++;
        return;
      }

      // 組み込み関数を実行
      const shouldIncrementPc = await this.executeBuiltin(funcName, args);

      // PC制御コマンド（jump/call/ret）以外はPCをインクリメント
      if (shouldIncrementPc) {
        this.pc++;
      }
      return;
    }

    // その他の式（評価して結果を捨てる）
    try {
      await this.evaluator.evaluate(line, this.state);
    } catch (error) {
      throw this.enhanceEvaluatorError(error);
    }

    this.pc++;
  }

  /**
   * 組み込みコマンドを実行
   * @param name コマンド名
   * @param args 引数の配列
   * @returns PC制御コマンド（jump/call/ret）の場合はfalse、それ以外はtrue
   */
  private async executeBuiltin(name: string, args: unknown[]): Promise<boolean> {
    switch (name) {
      case "bg":
        await this.engine.setBg(String(args[0]), args[1] as string | undefined);
        return true;

      case "ch":
        await this.engine.showChar(
          String(args[0]),
          String(args[1]),
          args[2] as string | undefined,
          args[3] !== undefined ? Number(args[3]) : undefined
        );
        return true;

      case "ch_anim":
        await this.engine.showCharAnim(
          String(args[0]),
          String(args[1]),
          String(args[2])
        );
        return true;

      case "ch_hide":
        await this.engine.hideChar(
          String(args[0]),
          args[1] !== undefined ? Number(args[1]) : undefined
        );
        return true;

      case "ch_clear":
        await this.engine.clearChars(
          args[0] !== undefined ? Number(args[0]) : undefined
        );
        return true;

      case "bgm":
        this.engine.playBgm(
          String(args[0]),
          args[1] !== undefined ? Number(args[1]) : undefined,
          args[2] !== undefined ? Number(args[2]) : undefined
        );
        return true;

      case "bgm_stop":
        if (args[0] !== undefined && Number(args[0]) > 0) {
          await this.engine.fadeBgm(Number(args[0]));
        } else {
          this.engine.stopBgm();
        }
        return true;

      case "se":
        this.engine.playSe(
          String(args[0]),
          args[1] !== undefined ? Number(args[1]) : undefined
        );
        return true;

      case "voice":
        this.engine.playVoice(String(args[0]));
        return true;

      case "wait":
        await this.engine.wait(Number(args[0]));
        return true;

      case "waitclick":
        await this.engine.waitForClick();
        return true;

      case "timeline":
      case "timeline_play":
        await this.engine.playTimeline(String(args[0]));
        return true;

      case "battle": {
        const troopId = String(args[0]);
        const onWin = args[1] !== undefined ? String(args[1]) : undefined;
        const onLose = args[2] !== undefined ? String(args[2]) : undefined;
        const result = await this.engine.battleStart(troopId);
        if (result === "win" && onWin) {
          this.executeJump(onWin);
          return false;
        } else if (result === "lose" && onLose) {
          this.executeJump(onLose);
          return false;
        }
        return true;
      }

      // Phase 2: jump, call, ret (PC制御コマンド)
      case "jump":
        this.executeJump(String(args[0]));
        return false; // PCは自分で管理する

      case "call":
        this.executeCall(String(args[0]));
        return false; // PCは自分で管理する

      case "ret":
        this.executeRet();
        return false; // PCは自分で管理する

      // Phase 4: choice は専用の構文解析が必要

      default:
        console.warn(`未実装のコマンド: ${name}`);
        return true;
    }
  }

  /**
   * jump(label) を実行
   * @param label ジャンプ先のラベル名
   */
  private executeJump(label: string): void {
    const lineNum = this.state.labelMap.get(label);
    if (lineNum === undefined) {
      throw new Error(`[KNF Error] 未定義のラベル: ${label}`);
    }
    this.pc = lineNum + 1; // ラベル行の次から実行
  }

  /**
   * call(label) を実行 - サブルーチン呼び出し
   * @param label 呼び出し先のラベル名
   */
  private executeCall(label: string): void {
    const lineNum = this.state.labelMap.get(label);
    if (lineNum === undefined) {
      throw new Error(`[KNF Error] 未定義のラベル: ${label}`);
    }

    // 呼び出しフレームをプッシュ（v2.1仕様）
    this.state.pushFrame({
      returnPc: this.pc + 1, // 次の行に戻る
      scopeDepth: this.state.localScopes.length,
      kind: "label",
      source: {
        line: this.pc,
        name: `call(${label})`,
      },
    });

    // ジャンプ
    this.pc = lineNum + 1;
  }

  /**
   * ret() を実行 - call元に戻る
   */
  private executeRet(): void {
    const frame = this.state.popFrame();
    if (!frame) {
      throw new Error(`[KNF Error] ret()が呼ばれましたが、呼び出しスタックが空です`);
    }

    // v2.1仕様: ret()はlabel呼び出しの復帰専用
    if (frame.kind !== "label") {
      throw new Error(
        `[KNF Error] ret()は call(label) の復帰専用です（${frame.kind}からは使えません）`
      );
    }

    // 呼び出し元に戻る
    this.pc = frame.returnPc;
  }

  /**
   * if文を処理
   * @param line if文の行（例: "if (affection >= 5) {"）
   */
  private async handleIf(line: string): Promise<void> {
    // 条件式を抽出（if と { の間）
    const conditionMatch = line.match(/if\s*\((.+)\)\s*\{/);
    if (!conditionMatch) {
      throw new Error(`[KNF Error] Line ${this.pc + 1}: if文の構文が正しくありません`);
    }

    const condition = conditionMatch[1];

    // 条件を評価
    const result = await this.evaluator.evaluateCondition(condition, this.state);

    if (result) {
      // 条件が真の場合、ブロック内を実行
      this.pc++;
      const blockEndPc = await this.executeBlock();

      // ブロック内でjumpなどが実行された場合（blockEndPc === -1）はそのまま
      if (blockEndPc !== -1) {
        // else if/else をスキップ
        this.skipElseChain();
      }
    } else {
      // 条件が偽の場合、ブロックをスキップして else if/else を探す
      const blockEnd = this.parser.findBlockEnd(this.lines, this.pc);
      this.pc = blockEnd; // blockEnd is the "}" or "} else" line

      // else if/else があるかチェック
      await this.handleElseChain();

      // else chainがなかった場合、"}"をスキップ
      if (this.pc < this.lines.length && this.lines[this.pc].trim() === "}") {
        this.pc++;
      }
    }
  }

  /**
   * ブロック内を実行（{ から } まで）
   * @returns ブロック終了時のPC位置（}の次の行）、またはjump等で中断した場合は現在のPC
   */
  private async executeBlock(): Promise<number> {
    let braceCount = 1;

    while (this.pc < this.lines.length && braceCount > 0) {
      const line = this.lines[this.pc].trim();

      // セリフブロックは特別処理
      if (this.parser.classifyLine(line) === LineType.DialogueStart) {
        await this.handleDialogue(line);
        continue;
      }

      // } else if や } else の場合、現在のブロックを終了
      // ブレースカウント前にチェックする必要がある
      if (braceCount === 1 && (line.startsWith("} else if") || line === "} else {")) {
        return this.pc;
      }

      // ブレースカウント
      if (line.endsWith("{") && !line.startsWith("//")) {
        braceCount++;
      }

      if (line === "}") {
        braceCount--;
        if (braceCount === 0) {
          this.pc++;
          return this.pc;
        }
      }

      // 空行・コメント・閉じブレースはスキップ
      if (line === "" || line.startsWith("//") || line === "}") {
        this.pc++;
        continue;
      }

      // 通常の処理
      const pcBefore = this.pc;
      await this.step();

      // PC制御コマンド（jump/call/ret）が実行されたかチェック
      // 通常は1ずつ進むが、jumpなどが実行された場合は大きく変わる
      const pcDiff = Math.abs(this.pc - pcBefore);
      if (pcDiff > 1 || this.pc < pcBefore) {
        // jump等が実行された場合、ブロックを抜ける
        return -1; // 特別な値：ブロックから脱出
      }
    }

    return this.pc;
  }

  /**
   * else if/else チェーンをスキップ
   */
  private skipElseChain(): void {
    while (this.pc < this.lines.length) {
      const line = this.lines[this.pc].trim();

      if (line.startsWith("} else if (") || line === "} else {") {
        // } else の "}" 部分は前のブロックの終了なので、次の行から探す
        // "{ ... }" のブロックを見つける
        this.pc++; // "} else {" の次の行へ

        // ブロック内を読み飛ばす
        let braceCount = 1;
        while (this.pc < this.lines.length && braceCount > 0) {
          const innerLine = this.lines[this.pc].trim();

          // セリフブロックはスキップ
          if (this.parser.classifyLine(innerLine) === LineType.DialogueStart) {
            const dialogueEnd = this.parser.findDialogueEnd(this.lines, this.pc);
            this.pc = dialogueEnd + 1;
            continue;
          }

          if (innerLine.endsWith("{") && !innerLine.startsWith("//")) {
            braceCount++;
          }
          if (innerLine === "}" || innerLine.startsWith("} else")) {
            braceCount--;
            if (braceCount === 0) {
              // PCは "}" または "} else" を指している
              if (!innerLine.startsWith("} else")) {
                // 単なる "}" ならスキップして終了
                this.pc++;
              }
              break; // 次の } else を見つけた、またはブロック終了
            }
          }

          this.pc++;
        }

        // braceCount === 0 の場合、PCは次の "} else" または "}" の次を指している
        // ループを続けて次のelse chainをチェック
      } else {
        break;
      }
    }
  }

  /**
   * else if/else チェーンを処理
   */
  private async handleElseChain(): Promise<void> {
    if (this.pc >= this.lines.length) {
      return;
    }

    const line = this.lines[this.pc].trim();

    // else if の場合
    if (line.startsWith("} else if (")) {
      const conditionMatch = line.match(/\} else if\s*\((.+)\)\s*\{/);
      if (!conditionMatch) {
        throw new Error(`[KNF Error] Line ${this.pc + 1}: else if文の構文が正しくありません`);
      }

      const condition = conditionMatch[1];
      const result = await this.evaluator.evaluateCondition(condition, this.state);

      if (result) {
        // 条件が真の場合、ブロック内を実行
        this.pc++;
        const blockEndPc = await this.executeBlock();

        // ブロック内でjumpなどが実行された場合（blockEndPc === -1）はそのまま
        if (blockEndPc !== -1) {
          // 後続の else if/else をスキップ
          this.skipElseChain();
        }
      } else {
        // 条件が偽の場合、ブロックをスキップして次の else if/else を探す
        const blockEnd = this.parser.findBlockEnd(this.lines, this.pc);
        this.pc = blockEnd; // blockEnd is the "}" or "} else" line

        // else if/else があるかチェック
        await this.handleElseChain();

        // else chainがなかった場合、"}"をスキップ
        if (this.pc < this.lines.length && this.lines[this.pc].trim() === "}") {
          this.pc++;
        }
      }
      return;
    }

    // else の場合
    if (line === "} else {") {
      this.pc++;
      await this.executeBlock();
      return;
    }
  }

  /**
   * choice構文を処理
   */
  private async handleChoice(): Promise<void> {
    // choice構文をパース
    const choiceNode = this.parser.parseChoice(this.lines, this.pc);

    // 表示可能な選択肢をフィルタ
    const visibleOptions: Array<{ text: string; index: number }> = [];

    for (let i = 0; i < choiceNode.options.length; i++) {
      const option = choiceNode.options[i];

      // 条件がある場合は評価
      let visible = true;
      if (option.condition) {
        try {
          visible = await this.evaluator.evaluateCondition(option.condition, this.state);
        } catch (error) {
          throw new Error(
            `[KNF Error] Line ${this.pc + 1}: 選択肢の条件評価エラー: ${error}`
          );
        }
      }

      if (visible) {
        visibleOptions.push({
          text: option.text,
          index: i,
        });
      }
    }

    // 選択肢がない場合はエラー
    if (visibleOptions.length === 0) {
      throw new Error(`[KNF Error] Line ${this.pc + 1}: 表示可能な選択肢がありません`);
    }

    // エンジンに選択肢を表示
    const selectedIndex = await this.engine.showChoice(
      visibleOptions.map((o) => ({ text: o.text }))
    );

    // 選択された選択肢のブロックを実行
    const selectedOption = choiceNode.options[visibleOptions[selectedIndex].index];
    this.pc = selectedOption.bodyStart;
    const blockEndPc = await this.executeBlock();

    // ブロック内でjumpなどが実行された場合（blockEndPc === -1）はPCがすでに変更されている
    // ブロックを正常に抜けた場合のみ、choice終了位置に移動
    if (blockEndPc !== -1) {
      this.pc = choiceNode.end + 1;
    }
  }

  /**
   * ユーザー定義関数/サブルーチンを実行 (Phase 5)
   */
  private async executeUserFunction(name: string, args: unknown[]): Promise<unknown> {
    // Phase 7-2: 関数呼び出しトレース
    if (this.debugger.isEnabled()) {
      this.debugger.traceFunctionCall(name, args, this.pc + 1);
    }

    const funcDef = this.state.functions.get(name) || this.state.subroutines.get(name);
    if (!funcDef) {
      throw new Error(`[KNF Error] 未定義の関数: ${name}`);
    }

    const isSub = this.state.subroutines.has(name);

    // 引数の数チェック
    if (args.length !== funcDef.params.length) {
      throw new Error(
        `[KNF Error] 関数 '${name}' の引数の数が一致しません（期待: ${funcDef.params.length}, 実際: ${args.length}）`
      );
    }

    // 再帰深度チェック (v2: 上限16)
    const currentDepth = this.state.callStack.filter(
      (f) => f.kind === "function" || f.kind === "subroutine"
    ).length;
    if (currentDepth >= 16) {
      throw new Error(`[KNF Error] 再帰呼び出しの深度が上限（16）を超えました`);
    }

    // ローカルスコープをプッシュ
    this.state.pushScope();

    // 引数を束縛
    for (let i = 0; i < funcDef.params.length; i++) {
      this.state.setLocalVar(funcDef.params[i], args[i]);
    }

    // 呼び出しフレームをプッシュ (v2.1)
    const returnPc = this.pc;
    this.state.pushFrame({
      returnPc,
      scopeDepth: this.state.localScopes.length,
      kind: isSub ? "subroutine" : "function",
      source: {
        line: this.pc,
        name: `${isSub ? "sub" : "def"} ${name}`,
      },
    });

    // 関数本体を実行
    this.pc = funcDef.bodyStart;
    let returnValue: unknown = undefined;

    while (this.pc <= funcDef.bodyEnd && this.pc < this.lines.length) {
      const line = this.lines[this.pc].trim();

      // return文を検出したら終了
      if (line.startsWith("return ") || line === "return") {
        returnValue = await this.handleReturn(line);
        break;
      }

      await this.step();

      // PC が範囲外に出た場合（jumpなど）は終了
      if (this.pc < funcDef.bodyStart || this.pc > funcDef.bodyEnd) {
        break;
      }
    }

    // 呼び出しフレームをポップ
    this.state.popFrame();

    // ローカルスコープをポップ
    this.state.popScope();

    // PCを復元
    this.pc = returnPc;

    // Phase 7-2: 関数戻りトレース
    if (this.debugger.isEnabled()) {
      this.debugger.traceFunctionReturn(name, returnValue, this.pc + 1);
    }

    // subは戻り値なし、defは戻り値あり
    return returnValue;
  }

  /**
   * return文を処理 (Phase 5完成: 非同期化)
   */
  private async handleReturn(line: string): Promise<unknown> {
    // 現在の呼び出しフレームを確認
    const frame = this.state.callStack[this.state.callStack.length - 1];
    if (!frame) {
      throw new Error(
        `[KNF Error] Line ${this.pc + 1}: return文は関数/サブルーチン内でのみ使用できます`
      );
    }

    // v2.1: subではreturn exprを禁止
    if (frame.kind === "subroutine" && line !== "return") {
      throw new Error(
        `[KNF Error] Line ${this.pc + 1}: サブルーチン内では値を返すreturnは使用できません`
      );
    }

    // v2.1: defでは値を返すreturnのみ許可（return単体は警告なしで許可）
    if (frame.kind === "function" && line === "return") {
      return undefined;
    }

    // v2.1: labelからのret()は別処理（executeRetで処理済み）
    if (frame.kind === "label") {
      throw new Error(
        `[KNF Error] Line ${this.pc + 1}: ラベルからの復帰は ret() を使用してください`
      );
    }

    // return値を評価
    if (line.startsWith("return ")) {
      const expr = line.slice(7).trim();
      try {
        return await this.evaluator.evaluate(expr, this.state);
      } catch (error) {
        // Phase 7: エラーを拡張して再スロー
        const enhanced = this.enhanceEvaluatorError(error);
        throw new Error(`return式の評価エラー: ${enhanced.message}`);
      }
    }

    return undefined;
  }

  /**
   * 組み込み関数名かどうかチェック (Phase 5, v2.1)
   */
  private isBuiltinFunction(name: string): boolean {
    const builtins = [
      "bg",
      "ch",
      "ch_anim",
      "ch_hide",
      "ch_clear",
      "bgm",
      "bgm_stop",
      "se",
      "voice",
      "wait",
      "waitclick",
      "timeline",
      "timeline_play",
      "battle",
      "jump",
      "call",
      "ret",
    ];
    return builtins.includes(name);
  }

  /**
   * エラー用のスタックトレースを構築 (Phase 7)
   */
  private buildErrorStack(): ErrorCallFrame[] {
    const stack: ErrorCallFrame[] = [];

    // 現在のコンテキストを追加
    stack.push({
      functionName: "<main>",
      line: this.pc + 1,
    });

    // コールスタックを逆順で追加
    for (let i = this.state.callStack.length - 1; i >= 0; i--) {
      const frame = this.state.callStack[i];
      if (frame.source) {
        stack.push({
          functionName: frame.source.name,
          line: frame.source.line + 1,
        });
      }
    }

    return stack.reverse();
  }

  /**
   * Evaluatorからのエラーを拡張 (Phase 7)
   * 未定義変数エラーの場合、提案とコンテキストを追加
   */
  private enhanceEvaluatorError(error: unknown): Error {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 未定義変数エラーをチェック
    const undefinedVarMatch = errorMessage.match(/未定義の変数: (\w+)/);
    if (undefinedVarMatch) {
      const varName = undefinedVarMatch[1];
      const knfError = ErrorHandler.createReferenceError(
        varName,
        this.pc + 1,
        this.getAvailableVariables(),
        this.buildErrorStack(),
        this.script
      );
      return new Error(ErrorHandler.formatError(knfError));
    }

    // その他のエラーはそのまま返す
    return new Error(`[KNF Error] Line ${this.pc + 1}: ${errorMessage}`);
  }

  /**
   * 定義済み変数名の一覧を取得 (Phase 7)
   */
  private getAvailableVariables(): string[] {
    const vars = new Set<string>();

    // グローバル変数
    for (const key of this.state.variables.keys()) {
      vars.add(key);
    }

    // ローカルスコープの変数
    for (const scope of this.state.localScopes) {
      for (const key of scope.keys()) {
        vars.add(key);
      }
    }

    return Array.from(vars);
  }

  /**
   * 定義済み関数名の一覧を取得 (Phase 7)
   */
  private getAvailableFunctions(): string[] {
    const funcs = new Set<string>();

    for (const name of this.state.functions.keys()) {
      funcs.add(name);
    }

    for (const name of this.state.subroutines.keys()) {
      funcs.add(name);
    }

    return Array.from(funcs);
  }

  /**
   * 現在の状態を取得（セーブ用、Phase 7で実装）
   */
  getState() {
    return {
      pc: this.pc,
      variables: Object.fromEntries(this.state.variables),
      callStack: this.state.callStack.length,
    };
  }

  /**
   * デバッガーインスタンスを取得 (Phase 7-2)
   */
  getDebugger(): Debugger {
    return this.debugger;
  }
}
