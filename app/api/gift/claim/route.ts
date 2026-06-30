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

function buildEmailHtml(url: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
    <div style="background:#1a1a1a;padding:28px 32px;text-align:center;">
      <h1 style="margin:0;color:#c9a84c;font-size:20px;letter-spacing:4px;font-weight:400;">L-STAY HOTEL</h1>
      <p style="margin:6px 0 0;color:rgba(201,168,76,0.6);font-size:11px;letter-spacing:2px;">MINPAKU · AICHI · JAPAN</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:15px;color:#333;line-height:1.8;margin:0 0 24px;">
        この度はL-STAY HOTELをご利用いただき、またGoogleクチコミへのご協力をありがとうございます。<br>
        スターバックスeギフトをお送りします。
      </p>
      <div style="background:#fdf8f0;border:1px solid #e8c96a;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
        <p style="margin:0 0 16px;font-size:13px;color:#888;">☕ スターバックスeギフト</p>
        <a href="${url}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#c9a84c,#e8c96a);color:#1a1100;text-decoration:none;border-radius:4px;font-weight:700;font-size:15px;letter-spacing:1px;">
          ギフトを受け取る
        </a>
        <p style="margin:14px 0 0;font-size:11px;color:#aaa;word-break:break-all;line-height:1.6;">${url}</p>
      </div>
      <div style="background:#fff8e8;border-left:3px solid #c9a84c;padding:12px 16px;border-radius:0 4px 4px 0;">
        <p style="margin:0;font-size:12px;color:#666;line-height:1.7;">
          ⚠️ URLには有効期限があります。お早めにご利用ください。<br>
          ⚠️ このURLは1回限り有効です。第三者への共有はご遠慮ください。<br>
          ⚠️ Valid in Japan only. International guests, please use before returning home.
        </p>
      </div>
    </div>
    <div style="background:#f9f9f9;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;font-size:11px;color:#bbb;letter-spacing:1px;">© L-STAY HOTEL · Aichi, Japan</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendGiftEmail(
  resendApiKey: string,
  fromEmail: string,
  toEmail: string,
  giftUrl: string,
): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmail,
        subject: "【L-STAY HOTEL】スターバックスeギフトのご案内",
        html: buildEmailHtml(giftUrl),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const { gmail, name } = await req.json() as { gmail?: string; name?: string };
  if (!gmail || !/^[^\s@]+@gmail\.com$/i.test(gmail)) {
    return NextResponse.json({ error: "有効なGmailアドレスを入力してください" }, { status: 400 });
  }
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "お名前を入力してください" }, { status: 400 });
  }
  const guestName = name.trim();

  const { env } = getRequestContext();
  const db = (env as Record<string, unknown>).GIFT_DB as D1Database | undefined;
  if (!db) return NextResponse.json({ error: "DB未設定" }, { status: 500 });

  const normalizedGmail = gmail.toLowerCase();

  // メール送信設定
  const resendApiKey = (env as Record<string, unknown>).RESEND_API_KEY as string | undefined;
  const fromEmail = (env as Record<string, unknown>).RESEND_FROM_EMAIL as string | undefined ?? "gift@lcityreview.l-city.co.jp";

  // 既存クレーム確認
  const existing = await db
    .prepare("SELECT url FROM gift_codes WHERE recipient_gmail = ? LIMIT 1")
    .bind(normalizedGmail)
    .first<{ url: string }>();

  if (existing) {
    const emailSent = resendApiKey
      ? await sendGiftEmail(resendApiKey, fromEmail, normalizedGmail, existing.url)
      : false;
    return NextResponse.json({ success: true, url: existing.url, alreadyClaimed: true, emailSent });
  }

  // 未使用コードを取得して配布
  const code = await db
    .prepare("SELECT id, url FROM gift_codes WHERE used = 0 LIMIT 1")
    .first<{ id: number; url: string }>();

  if (!code) {
    return NextResponse.json(
      { error: "ギフトコードが不足しています。スタッフにお声がけください。" },
      { status: 503 },
    );
  }

  await db
    .prepare("UPDATE gift_codes SET used = 1, recipient_gmail = ?, recipient_name = ?, distributed_at = datetime('now') WHERE id = ?")
    .bind(normalizedGmail, guestName, code.id)
    .run();

  const emailSent = resendApiKey
    ? await sendGiftEmail(resendApiKey, fromEmail, normalizedGmail, code.url)
    : false;

  return NextResponse.json({ success: true, url: code.url, alreadyClaimed: false, emailSent });
}
