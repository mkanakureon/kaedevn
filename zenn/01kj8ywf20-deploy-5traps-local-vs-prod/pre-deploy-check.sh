#!/bin/bash
# pre-deploy-check.sh — デプロイ前チェックスクリプト
# 使用方法: ./scripts/pre-deploy-check.sh
#
# 4 つのチェックを実行:
#   1. TypeScript 型チェック（Editor + Next.js）
#   2. Next.js ESLint
#   3. Prisma マイグレーション状態
#   4. DB スキーマ同期テスト

set -e

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "ERROR: git リポジトリ内で実行してください" >&2; exit 1; }

PASSED=0
FAILED=0
ERRORS=()

check() {
  local label="$1"
  shift
  echo ""
  echo "========================================="
  echo "  CHECK: $label"
  echo "========================================="
  if "$@"; then
    echo "  ✅ PASS: $label"
    PASSED=$((PASSED + 1))
  else
    echo "  ❌ FAIL: $label"
    FAILED=$((FAILED + 1))
    ERRORS+=("$label")
  fi
}

# --- 1. TypeScript 型チェック ---
check "TypeScript (Editor)" npx tsc --noEmit -p "$REPO_ROOT/apps/editor/tsconfig.app.json"
check "TypeScript (Next.js)" npx tsc --noEmit -p "$REPO_ROOT/apps/next/tsconfig.json"

# --- 2. Next.js ESLint ---
check "Next.js ESLint" npx next lint --dir "$REPO_ROOT/apps/next"

# --- 3. Prisma マイグレーション状態 ---
check "Prisma migrate status" npx prisma migrate status --schema="$REPO_ROOT/apps/hono/prisma/schema.prisma"

# --- 4. DB スキーマ同期テスト ---
check "Schema sync test" npx vitest run "$REPO_ROOT/apps/hono/test/schema-sync.test.ts" --config "$REPO_ROOT/apps/hono/vitest.config.ts"

# --- 結果サマリ ---
echo ""
echo "========================================="
echo "  RESULT: $PASSED passed, $FAILED failed"
echo "========================================="

if [ $FAILED -gt 0 ]; then
  echo ""
  echo "失敗したチェック:"
  for e in "${ERRORS[@]}"; do
    echo "  - $e"
  done
  echo ""
  echo "⚠️  デプロイ前に修正してください"
  exit 1
fi

echo ""
echo "✅ 全チェック通過 — デプロイ可能"
