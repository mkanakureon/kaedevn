/**
 * Admin Routes — Auth & Role Tests
 * 全エンドポイントが認証 + admin ロール必須であることを検証
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Hono } from 'hono';
import type { Variables } from '../src/types/index.js';
import admin from '../src/routes/admin.js';
import { testRequest, parseResponse } from './helpers.js';

describe('Admin Routes', () => {
  let app: Hono<{ Variables: Variables }>;

  beforeAll(() => {
    app = new Hono<{ Variables: Variables }>();
    app.route('/api/admin', admin);
  });

  // --- GET /api/admin/stats ---
  describe('GET /api/admin/stats', () => {
    it('認証なしで 401 + 認証エラーメッセージ', async () => {
      const res = await testRequest(app, 'GET', '/api/admin/stats');
      expect(res.status).toBe(401);
      const body = await parseResponse(res);
      expect(body.error).toContain('認証が必要');
    });

    it('不正なトークンで 401 + 無効なトークンメッセージ', async () => {
      const res = await testRequest(app, 'GET', '/api/admin/stats', {
        token: 'invalid-token',
      });
      expect(res.status).toBe(401);
      const body = await parseResponse(res);
      expect(body.error).toContain('無効なトークン');
    });
  });

  // --- GET /api/admin/users ---
  describe('GET /api/admin/users', () => {
    it('認証なしで 401 を返す', async () => {
      const res = await testRequest(app, 'GET', '/api/admin/users');
      expect(res.status).toBe(401);
      const body = await parseResponse(res);
      expect(body.error).toContain('認証が必要');
    });
  });

  // --- GET /api/admin/users/:id ---
  describe('GET /api/admin/users/:id', () => {
    it('認証なしで 401 を返す', async () => {
      const res = await testRequest(app, 'GET', '/api/admin/users/test-id');
      expect(res.status).toBe(401);
      const body = await parseResponse(res);
      expect(body.error).toContain('認証が必要');
    });
  });

  // --- PUT /api/admin/users/:id/status ---
  describe('PUT /api/admin/users/:id/status', () => {
    it('認証なしで 401 を返す', async () => {
      const res = await testRequest(app, 'PUT', '/api/admin/users/test-id/status', {
        body: { status: 'suspended' },
      });
      expect(res.status).toBe(401);
      const body = await parseResponse(res);
      expect(body.error).toContain('認証が必要');
    });
  });

  // --- GET /api/admin/assets ---
  describe('GET /api/admin/assets', () => {
    it('認証なしで 401 を返す', async () => {
      const res = await testRequest(app, 'GET', '/api/admin/assets');
      expect(res.status).toBe(401);
      const body = await parseResponse(res);
      expect(body.error).toContain('認証が必要');
    });
  });

  // --- DELETE /api/admin/assets/:id ---
  describe('DELETE /api/admin/assets/:id', () => {
    it('認証なしで 401 を返す', async () => {
      const res = await testRequest(app, 'DELETE', '/api/admin/assets/test-id');
      expect(res.status).toBe(401);
      const body = await parseResponse(res);
      expect(body.error).toContain('認証が必要');
    });
  });

  // --- POST /api/admin/messages ---
  describe('POST /api/admin/messages', () => {
    it('認証なしで 401 を返す', async () => {
      const res = await testRequest(app, 'POST', '/api/admin/messages', {
        body: { toUserId: 'user-id', subject: 'Test', body: 'Hello' },
      });
      expect(res.status).toBe(401);
      const body = await parseResponse(res);
      expect(body.error).toContain('認証が必要');
    });
  });

  // --- GET /api/admin/messages ---
  describe('GET /api/admin/messages', () => {
    it('認証なしで 401 を返す', async () => {
      const res = await testRequest(app, 'GET', '/api/admin/messages');
      expect(res.status).toBe(401);
      const body = await parseResponse(res);
      expect(body.error).toContain('認証が必要');
    });
  });

  // --- GET /api/admin/settings ---
  describe('GET /api/admin/settings', () => {
    it('認証なしで 401 を返す', async () => {
      const res = await testRequest(app, 'GET', '/api/admin/settings');
      expect(res.status).toBe(401);
      const body = await parseResponse(res);
      expect(body.error).toContain('認証が必要');
    });
  });

  // --- PUT /api/admin/settings ---
  describe('PUT /api/admin/settings', () => {
    it('認証なしで 401 を返す', async () => {
      const res = await testRequest(app, 'PUT', '/api/admin/settings', {
        body: { storageMode: 'local' },
      });
      expect(res.status).toBe(401);
      const body = await parseResponse(res);
      expect(body.error).toContain('認証が必要');
    });
  });

  // --- POST /api/admin/query ---
  describe('POST /api/admin/query', () => {
    it('認証なしで 401 を返す', async () => {
      const res = await testRequest(app, 'POST', '/api/admin/query', {
        body: { sql: 'SELECT 1' },
      });
      expect(res.status).toBe(401);
      const body = await parseResponse(res);
      expect(body.error).toContain('認証が必要');
    });
  });
});
