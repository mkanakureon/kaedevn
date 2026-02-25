/**
 * Preview Routes — ルーティング + generateKSCScript ユニットテスト
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { Hono } from 'hono';
import type { Variables } from '../src/types/index.js';

// prisma モック（DB 不要でテスト可能にする）
vi.mock('../src/lib/db.js', () => ({
  prisma: {
    project: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    character: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock('../src/lib/config.js', () => ({
  resolveAssetUrl: (path: string) => `https://cdn.example.com/${path}`,
}));

import preview from '../src/routes/preview.js';
import { generateKSCScript, generateChCommand } from '../src/routes/preview.js';
import { testRequest, parseResponse } from './helpers.js';

// =============================================
// Route Tests
// =============================================
describe('Preview Routes', () => {
  let app: Hono<{ Variables: Variables }>;

  beforeAll(() => {
    app = new Hono<{ Variables: Variables }>();
    app.route('/api/preview', preview);
  });

  describe('GET /api/preview/:id', () => {
    it('存在しないプロジェクトで 404 を返す', async () => {
      const res = await testRequest(app, 'GET', '/api/preview/nonexistent-id');
      expect(res.status).toBe(404);
      const body = await parseResponse(res);
      expect(body.error).toContain('見つかりません');
    });

    it('認証なしでもアクセス可能（public endpoint）', async () => {
      const res = await testRequest(app, 'GET', '/api/preview/test-id');
      // 401 にはならない（認証不要）
      expect(res.status).not.toBe(401);
    });
  });
});

// =============================================
// generateKSCScript Unit Tests
// =============================================
describe('generateKSCScript', () => {
  it('空のページ配列で空文字列を返す', () => {
    const result = generateKSCScript('Test', []);
    expect(result).toBe('');
  });

  it('1ページ目のラベルは *start', () => {
    const pages = [{ blocks: [] }];
    const result = generateKSCScript('Test', pages);
    expect(result).toContain('*start');
    expect(result).not.toContain('*page1');
  });

  it('2ページ目のラベルは *page2', () => {
    const pages = [{ blocks: [] }, { blocks: [] }];
    const result = generateKSCScript('Test', pages);
    expect(result).toContain('*start');
    expect(result).toContain('*page2');
  });

  it('タイトルがヘッダーコメントに含まれる', () => {
    const pages = [{ blocks: [] }];
    const result = generateKSCScript('My Visual Novel', pages);
    expect(result).toContain('; Title: My Visual Novel');
  });

  it('bg ブロックから @bg コマンドを生成', () => {
    const pages = [{ blocks: [{ type: 'bg', assetId: 'sunset' }] }];
    const result = generateKSCScript('Test', pages);
    expect(result).toContain('@bg sunset');
  });

  it('text ブロックから テキスト + @l を生成', () => {
    const pages = [{ blocks: [{ type: 'text', body: 'こんにちは' }] }];
    const result = generateKSCScript('Test', pages);
    expect(result).toContain('こんにちは');
    expect(result).toContain('@l');
  });

  it('jump ブロックから @jump コマンドを生成', () => {
    const pages = [{ blocks: [{ type: 'jump', toPageId: 'page2' }] }];
    const result = generateKSCScript('Test', pages);
    expect(result).toContain('@jump page2');
  });

  it('set_var ブロックから変数代入を生成', () => {
    const pages = [{ blocks: [{ type: 'set_var', varName: 'score', operator: '+=', value: '10' }] }];
    const result = generateKSCScript('Test', pages);
    expect(result).toContain('score += 10');
  });

  it('start ブロックはフィルタされる', () => {
    const pages = [{ blocks: [{ type: 'start' }, { type: 'bg', assetId: 'sky' }] }];
    const result = generateKSCScript('Test', pages);
    // start ブロックがコマンドとして出力されない（*start ラベルは出る）
    expect(result).not.toContain('@start');
    expect(result).toContain('*start');
    expect(result).toContain('@bg sky');
  });

  it('timeline ブロックから @timeline_play を生成', () => {
    const pages = [{ blocks: [{ type: 'timeline', id: 'tl-001' }] }];
    const result = generateKSCScript('Test', pages);
    expect(result).toContain('@timeline_play tl-001');
  });

  it('battle ブロックから @battle コマンドを生成', () => {
    const pages = [{
      blocks: [{
        type: 'battle',
        troopId: 'troop1',
        onWinPageId: 'win',
        onLosePageId: 'lose',
      }],
    }];
    const result = generateKSCScript('Test', pages);
    expect(result).toContain('@battle troop1 onWin=win onLose=lose');
  });

  it('choice ブロックから選択肢コマンドを生成', () => {
    const pages = [{
      blocks: [{
        type: 'choice',
        options: [
          {
            text: '行く',
            actions: [{ type: 'set_var', varName: 'go', operator: '=', value: '1' }],
          },
          {
            text: '行かない',
            actions: [],
          },
        ],
      }],
    }];
    const result = generateKSCScript('Test', pages);
    expect(result).toContain('choice {');
    expect(result).toContain('"行く"');
    expect(result).toContain('"行かない"');
    expect(result).toContain('go = 1');
  });

  it('if ブロックから条件分岐を生成', () => {
    const pages = [{
      blocks: [{
        type: 'if',
        conditions: [{ varName: 'score', operator: '>=', value: '5' }],
        thenBlocks: [{ type: 'bg', assetId: 'good' }],
        elseBlocks: [{ type: 'bg', assetId: 'bad' }],
      }],
    }];
    const result = generateKSCScript('Test', pages);
    expect(result).toContain('if (score >= 5)');
    expect(result).toContain('@bg good');
    expect(result).toContain('} else {');
    expect(result).toContain('@bg bad');
  });

  it('if ブロック else なし', () => {
    const pages = [{
      blocks: [{
        type: 'if',
        conditions: [{ varName: 'x', operator: '==', value: '1' }],
        thenBlocks: [{ type: 'jump', toPageId: 'p2' }],
      }],
    }];
    const result = generateKSCScript('Test', pages);
    expect(result).toContain('if (x == 1)');
    expect(result).toContain('@jump p2');
    expect(result).not.toContain('else');
  });

  it('複数条件の if ブロック', () => {
    const pages = [{
      blocks: [{
        type: 'if',
        conditions: [
          { varName: 'a', operator: '>=', value: '1', logicalOp: '&&' },
          { varName: 'b', operator: '<', value: '10' },
        ],
        thenBlocks: [{ type: 'bg', assetId: 'ok' }],
      }],
    }];
    const result = generateKSCScript('Test', pages);
    expect(result).toContain('if (a >= 1 && b < 10)');
  });
});

// =============================================
// generateChCommand Unit Tests
// =============================================
describe('generateChCommand', () => {
  const emptyKindMap = new Map<string, string>();
  const emptyCharMap = new Map<string, string>();
  const emptyExprMap = new Map<string, string>();

  it('characterId/expressionId 未設定で警告コメントを返す', () => {
    const result = generateChCommand(
      { characterId: '', expressionId: '', visible: true },
      '',
      emptyKindMap,
      emptyCharMap,
      emptyExprMap
    );
    expect(result).toContain('[警告]');
  });

  it('visible=true で @ch コマンドを生成（static）', () => {
    const charMap = new Map([['char1', 'hero']]);
    const exprMap = new Map([['expr1', 'smile']]);
    const result = generateChCommand(
      { characterId: 'char1', expressionId: 'expr1', visible: true, pos: 'C' },
      '',
      emptyKindMap,
      charMap,
      exprMap
    );
    expect(result).toBe('@ch hero smile center');
  });

  it('visible=true, kind=animated で @ch_anim コマンドを生成', () => {
    const charMap = new Map([['c1', 'npc']]);
    const exprMap = new Map([['e1', 'walk']]);
    const kindMap = new Map([['npc:walk', 'animated']]);
    const result = generateChCommand(
      { characterId: 'c1', expressionId: 'e1', visible: true, pos: 'L' },
      '',
      kindMap,
      charMap,
      exprMap
    );
    expect(result).toBe('@ch_anim npc walk left');
  });

  it('visible=false で @ch_hide を生成', () => {
    const charMap = new Map([['c1', 'hero']]);
    const result = generateChCommand(
      { characterId: 'c1', expressionId: 'e1', visible: false },
      '',
      emptyKindMap,
      charMap,
      emptyExprMap
    );
    expect(result).toBe('@ch_hide hero');
  });

  it('indent が適用される', () => {
    const charMap = new Map([['c1', 'hero']]);
    const exprMap = new Map([['e1', 'smile']]);
    const result = generateChCommand(
      { characterId: 'c1', expressionId: 'e1', visible: true, pos: 'R' },
      '  ',
      emptyKindMap,
      charMap,
      exprMap
    );
    expect(result).toBe('  @ch hero smile right');
  });

  it('マッピングにないIDはそのまま使用', () => {
    const result = generateChCommand(
      { characterId: 'unknown', expressionId: 'unk-expr', visible: true, pos: 'C' },
      '',
      emptyKindMap,
      emptyCharMap,
      emptyExprMap
    );
    expect(result).toBe('@ch unknown unk-expr center');
  });
});
