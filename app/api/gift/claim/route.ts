import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<{ success: boolean }>;
}

export async function POST(req: NextRequest) {
  try {
    const { gmail } = await req.json() as { gmail: string };

    if (!gmail || !/^[^\s@]+@gmail\.com$/i.test(gmail)) {
      return NextResponse.json({ error: "有効なGmailアドレスを入力してください" }, { status: 400 });
    }

    const { env } = getRequestContext();
    const db = (env as Record<string, unknown>).GIFT_DB as D1Database | undefined;
    if (!db) {
      return NextResponse.json({ error: "データベース未設定" }, { status: 500 });
    }

    // すでに同じGmailで受け取り済みかチェック
    const existing = await db.prepare(
      "SELECT url FROM gift_codes WHERE recipient_gmail = ? LIMIT 1"
    ).bind(gmail.toLowerCase()).first<{ url: string }>();

    if (existing) {
      return NextResponse.json({
        success: true,
        url: existing.url,
        alreadyClaimed: true,
      });
    }

    // 未使用コードを1件取得
    const code = await db.prepare(
      "SELECT id, url FROM gift_codes WHERE used = 0 LIMIT 1"
    ).first<{ id: number; url: string }>();

    if (!code) {
      return NextResponse.json({ error: "ギフトコードが残り少なくなっています。スタッフにお知らせください。" }, { status: 503 });
    }

    // コードを配布済みにする
    await db.prepare(
      "UPDATE gift_codes SET used = 1, recipient_gmail = ?, distributed_at = datetime('now') WHERE id = ?"
    ).bind(gmail.toLowerCase(), code.id).run();

    return NextResponse.json({ success: true, url: code.url });
  } catch (err) {
    console.error("Gift claim error:", err);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
