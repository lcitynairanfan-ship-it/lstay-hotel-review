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
  all<T = unknown>(): Promise<{ results: T[] }>;
}

interface GiftCode {
  id: number;
  url: string;
  used: number;
  recipient_gmail: string | null;
  distributed_at: string | null;
  created_at: string;
}

function checkAdmin(req: NextRequest): boolean {
  const pw = req.headers.get("x-admin-password") ?? req.nextUrl.searchParams.get("pw") ?? "";
  const adminPw = (process.env.ADMIN_PASSWORD ?? "lcity7350");
  return pw === adminPw;
}

// GET: 全コード一覧
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { env } = getRequestContext();
  const db = (env as Record<string, unknown>).GIFT_DB as D1Database | undefined;
  if (!db) return NextResponse.json({ error: "DB未設定" }, { status: 500 });

  const { results } = await db.prepare(
    "SELECT * FROM gift_codes ORDER BY id ASC"
  ).all<GiftCode>();

  const total = results.length;
  const used = results.filter(r => r.used === 1).length;

  return NextResponse.json({ total, used, remaining: total - used, codes: results });
}

// PATCH: コードのused状態をトグル
export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, used, recipient_gmail } = await req.json() as { id: number; used: number; recipient_gmail?: string };
  if (typeof id !== "number" || typeof used !== "number") {
    return NextResponse.json({ error: "id と used が必要です" }, { status: 400 });
  }

  const { env } = getRequestContext();
  const db = (env as Record<string, unknown>).GIFT_DB as D1Database | undefined;
  if (!db) return NextResponse.json({ error: "DB未設定" }, { status: 500 });

  if (used === 1) {
    await db.prepare(
      "UPDATE gift_codes SET used = 1, recipient_gmail = ?, distributed_at = datetime('now') WHERE id = ?"
    ).bind(recipient_gmail ?? null, id).run();
  } else {
    await db.prepare(
      "UPDATE gift_codes SET used = 0, recipient_gmail = NULL, distributed_at = NULL WHERE id = ?"
    ).bind(id).run();
  }

  return NextResponse.json({ success: true });
}

// POST: URLリストを追加インポート（改行区切り）
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { urls } = await req.json() as { urls: string };
  if (!urls) return NextResponse.json({ error: "urls が必要です" }, { status: 400 });

  const { env } = getRequestContext();
  const db = (env as Record<string, unknown>).GIFT_DB as D1Database | undefined;
  if (!db) return NextResponse.json({ error: "DB未設定" }, { status: 500 });

  const list = urls.split(/[\n,]/).map((s: string) => s.trim()).filter((s: string) => s.startsWith("http"));
  let imported = 0;
  for (const url of list) {
    try {
      await db.prepare("INSERT OR IGNORE INTO gift_codes (url) VALUES (?)").bind(url).run();
      imported++;
    } catch {
      // skip duplicates
    }
  }

  return NextResponse.json({ success: true, imported });
}
