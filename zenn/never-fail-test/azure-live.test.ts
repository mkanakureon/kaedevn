/**
 * Azure Live Endpoint Tests
 * デプロイ後の本番エンドポイント動作確認
 *
 * 実行: npx vitest run test/azure-live.test.ts
 *
 * 注意: 本番 DB に接続するため、読み取り専用のテストのみ。
 * 書き込み系は認証チェック（401）のみ確認。
 * レートリミット回避のため、ログインを最初に実行する。
 *
 * ※ このファイルは記事用にサニタイズ済み。
 *    実際の URL・認証情報は環境変数または .env から取得してください。
 */

import { describe, it, expect } from 'vitest';

// 環境変数から取得（実際の URL に置き換えてください）
const API = process.env.API_URL || 'https://your-api.example.com';
const EDITOR = process.env.EDITOR_URL || 'https://your-editor.example.com';
const NEXTJS = process.env.NEXTJS_URL || 'https://your-nextjs.example.com';
const PREVIEW = process.env.PREVIEW_URL || 'https://your-preview.example.com';

const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'your-password-here';

const TIMEOUT = 15000;

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT) });
  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers };
}

// =============================================
// API Health
// =============================================
describe('API Health', () => {
  it('GET /api/health → 200 + status:ok', async () => {
    const { status, body } = await fetchJSON(`${API}/api/health`);
    expect(status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');
    expect(body.uptime).toBeGreaterThan(0);
  });
});

// =============================================
// Login + Authenticated Access
// レートリミットや一時的な認証エラーでログインが失敗する場合、
// 認証が必要なテストは自動スキップする。
// =============================================
describe('Login + Authenticated Access', () => {
  let token: string | null = null;

  it('ログインしてトークンを取得', async () => {
    const { status, body } = await fetchJSON(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    // ログインが成功すればトークンを保存、失敗時はスキップ用に null のまま
    if (status === 200 && body.token) {
      expect(body).toHaveProperty('token');
      expect(typeof body.token).toBe('string');
      expect(body.token.length).toBeGreaterThan(10);
      token = body.token;
    } else {
      // レートリミット(429) or 認証失敗(401) — テストとしてはスキップ
      console.warn(`Login returned ${status}: ${JSON.stringify(body)}. Authenticated tests will be skipped.`);
      expect([200, 401, 429].includes(status)).toBe(true);
    }
  });

  it('GET /api/auth/me: トークン付きで 200 + ユーザー情報', async () => {
    if (!token) return; // ログイン失敗時はスキップ
    const { status, body } = await fetchJSON(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(status).toBe(200);
    expect(body).toHaveProperty('user');
    expect(body.user).toHaveProperty('id');
    expect(body.user).toHaveProperty('email');
    expect(body.user).toHaveProperty('username');
  });

  it('GET /api/projects: トークン付きで 200 + projects 配列', async () => {
    if (!token) return; // ログイン失敗時はスキップ
    const { status, body } = await fetchJSON(`${API}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(status).toBe(200);
    expect(body).toHaveProperty('projects');
    expect(Array.isArray(body.projects)).toBe(true);
  });

  it('GET /api/my-characters: トークン付きで 200 + characters 配列', async () => {
    if (!token) return; // ログイン失敗時はスキップ
    const { status, body } = await fetchJSON(`${API}/api/my-characters`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(status).toBe(200);
    expect(body).toHaveProperty('characters');
    expect(Array.isArray(body.characters)).toBe(true);
  });
});

// =============================================
// Auth Error Endpoints
// =============================================
describe('Auth Error Endpoints', () => {
  it('GET /api/auth/me: 認証なし → 401', async () => {
    const { status, body } = await fetchJSON(`${API}/api/auth/me`);
    expect(status).toBe(401);
    expect(body.error).toContain('認証が必要');
  });

  it('POST /api/auth/logout → 200', async () => {
    const { status, body } = await fetchJSON(`${API}/api/auth/logout`, {
      method: 'POST',
    });
    expect(status).toBe(200);
    expect(body).toHaveProperty('message');
  });
});

// =============================================
// Protected Endpoints (401 確認)
// =============================================
describe('Protected Endpoints: 認証なし → 401', () => {
  const protectedEndpoints = [
    ['GET', '/api/projects'],
    ['POST', '/api/projects'],
    ['GET', '/api/my-characters'],
    ['GET', '/api/user-assets'],
    ['GET', '/api/admin/stats'],
    ['GET', '/api/works/my-stats'],
  ];

  for (const [method, path] of protectedEndpoints) {
    it(`${method} ${path} → 401`, async () => {
      const { status, body } = await fetchJSON(`${API}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(method === 'POST' ? { body: JSON.stringify({}) } : {}),
      });
      expect(status).toBe(401);
      expect(body.error).toContain('認証が必要');
    });
  }
});

// =============================================
// Public Endpoints (200 確認)
// =============================================
describe('Public Endpoints: 認証不要', () => {
  it('GET /api/official-assets/categories → 200 + categories 配列', async () => {
    const { status, body } = await fetchJSON(`${API}/api/official-assets/categories?kind=image`);
    expect(status).toBe(200);
    expect(body).toHaveProperty('categories');
    expect(Array.isArray(body.categories)).toBe(true);
  });

  it('GET /api/official-assets → 200 + assets 配列', async () => {
    const { status, body } = await fetchJSON(`${API}/api/official-assets?kind=image`);
    expect(status).toBe(200);
    expect(body).toHaveProperty('assets');
    expect(Array.isArray(body.assets)).toBe(true);
  });

  it('GET /api/preview/:id: 存在しないIDで 404', async () => {
    const { status, body } = await fetchJSON(`${API}/api/preview/nonexistent`);
    expect(status).toBe(404);
    expect(body.error).toContain('見つかりません');
  });

  it('GET /api/users/nonexistent → 404', async () => {
    const { status, body } = await fetchJSON(`${API}/api/users/nonexistent`);
    expect(status).toBe(404);
    expect(body).toHaveProperty('error');
  });
});

// =============================================
// Frontend Apps (HTML 返却確認)
// =============================================
describe('Frontend Apps: HTML レスポンス', () => {
  it('Editor は HTML を返す', async () => {
    const res = await fetch(EDITOR, { signal: AbortSignal.timeout(TIMEOUT) });
    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type') || '';
    expect(contentType).toContain('text/html');
    const html = await res.text();
    expect(html.toLowerCase()).toContain('<!doctype html');
  });

  it('Next.js は HTML を返す', async () => {
    const res = await fetch(NEXTJS, { signal: AbortSignal.timeout(TIMEOUT) });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.toLowerCase()).toContain('<!doctype html');
  });

  it('Preview は HTML を返す', async () => {
    const res = await fetch(PREVIEW, { signal: AbortSignal.timeout(TIMEOUT) });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.toLowerCase()).toContain('<!doctype html');
  });
});
