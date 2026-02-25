/**
 * Official Assets Routes — ルーティング + 認証不要確認テスト
 *
 * prisma をモックして DB 依存を排除。
 * 公開エンドポイントが正しいレスポンスを返すことを確認。
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { Hono } from 'hono';

// prisma モック（DB 不要でテスト可能にする）
vi.mock('../src/lib/db.js', () => ({
  prisma: {
    officialAsset: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock('../src/lib/config.js', () => ({
  resolveAssetUrl: (path: string) => `https://cdn.example.com/${path}`,
}));

import officialAssets from '../src/routes/official-assets.js';
import { testRequest, parseResponse } from './helpers.js';

describe('Official Assets Routes', () => {
  let app: Hono;

  beforeAll(() => {
    app = new Hono();
    app.route('/api/official-assets', officialAssets);
  });

  // --- GET /api/official-assets/categories ---
  describe('GET /api/official-assets/categories', () => {
    it('認証不要で 200 を返す', async () => {
      const res = await testRequest(app, 'GET', '/api/official-assets/categories');
      expect(res.status).toBe(200);
      const body = await parseResponse(res);
      expect(body).toHaveProperty('categories');
      expect(Array.isArray(body.categories)).toBe(true);
    });

    it('kind パラメータ付きで 200 を返す', async () => {
      const res = await testRequest(app, 'GET', '/api/official-assets/categories?kind=image');
      expect(res.status).toBe(200);
    });

    it('category パラメータ付きで subcategories を返す', async () => {
      const res = await testRequest(app, 'GET', '/api/official-assets/categories?category=bg');
      expect(res.status).toBe(200);
      const body = await parseResponse(res);
      expect(body).toHaveProperty('subcategories');
    });
  });

  // --- GET /api/official-assets ---
  describe('GET /api/official-assets', () => {
    it('認証不要で 200 を返す', async () => {
      const res = await testRequest(app, 'GET', '/api/official-assets');
      expect(res.status).toBe(200);
      const body = await parseResponse(res);
      expect(body).toHaveProperty('assets');
      expect(Array.isArray(body.assets)).toBe(true);
    });

    it('kind パラメータでフィルタして 200', async () => {
      const res = await testRequest(app, 'GET', '/api/official-assets?kind=image');
      expect(res.status).toBe(200);
    });

    it('kind + category + subcategory でフィルタして 200', async () => {
      const res = await testRequest(
        app,
        'GET',
        '/api/official-assets?kind=image&category=bg&subcategory=outdoor'
      );
      expect(res.status).toBe(200);
    });
  });

  // --- 存在しないパス ---
  describe('存在しないパス', () => {
    it('GET /api/official-assets/nonexistent は 404 を返す', async () => {
      const res = await testRequest(app, 'GET', '/api/official-assets/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
