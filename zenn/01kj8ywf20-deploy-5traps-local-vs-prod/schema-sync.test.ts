/**
 * Schema Sync Test — Prisma schema と DB の整合性を検証
 *
 * deploy 前に実行して、マイグレーション漏れを検出する。
 * DB に接続して実際のカラム存在を確認する。
 */

import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Schema Sync — DB カラム存在チェック', () => {
  it('assets テーブルに slug カラムが存在する', async () => {
    const result = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'assets' AND column_name = 'slug'
    `;
    expect(result.length).toBe(1);
  });

  it('assets テーブルに subcategory カラムが存在する', async () => {
    const result = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'assets' AND column_name = 'subcategory'
    `;
    expect(result.length).toBe(1);
  });

  it('assets テーブルに source_type カラムが存在する', async () => {
    const result = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'assets' AND column_name = 'source_type'
    `;
    expect(result.length).toBe(1);
  });

  it('assets テーブルに frame_set_id カラムが存在する', async () => {
    const result = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'assets' AND column_name = 'frame_set_id'
    `;
    expect(result.length).toBe(1);
  });

  it('Prisma schema と DB が同期している（prisma migrate diff）', async () => {
    // schema の全テーブルに対して、Prisma が SELECT できることを確認
    // findFirst は schema に定義された全カラムを SELECT するため、
    // カラム不足があれば即エラーになる
    await expect(prisma.user.findFirst()).resolves.not.toThrow();
    await expect(prisma.project.findFirst()).resolves.not.toThrow();
    await expect(prisma.asset.findFirst()).resolves.not.toThrow();
    await expect(prisma.work.findFirst()).resolves.not.toThrow();
    await expect(prisma.character.findFirst()).resolves.not.toThrow();
    await expect(prisma.expression.findFirst()).resolves.not.toThrow();
    await expect(prisma.frameSet.findFirst()).resolves.not.toThrow();
  });
});

describe('Projects API — プロジェクト詳細取得', () => {
  it('存在するプロジェクトの詳細を取得できる（DB 直接）', async () => {
    // テスト用: 任意のプロジェクトを1件取得して、関連テーブルも含めてクエリが通ることを確認
    const project = await prisma.project.findFirst();
    if (!project) {
      // プロジェクトがなければスキップ（空 DB）
      return;
    }

    // projects.ts:141 と同じクエリ — ここでエラーが出れば本番でも出る
    const assets = await prisma.asset.findMany({
      where: { projectId: project.id, kind: { notIn: ['frame', 'ch-class'] } },
      orderBy: { createdAt: 'asc' },
    });
    expect(Array.isArray(assets)).toBe(true);

    const characters = await prisma.character.findMany({
      where: { projectId: project.id },
      orderBy: { sortOrder: 'asc' },
      include: {
        expressions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            imageAsset: { select: { id: true, blobPath: true } },
            frameSet: {
              include: {
                previewAsset: { select: { id: true, blobPath: true } },
              },
            },
          },
        },
      },
    });
    expect(Array.isArray(characters)).toBe(true);
  });
});
