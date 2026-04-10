import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

async function checkRateLimit(req: NextRequest): Promise<boolean> {
  try {
    const { env } = getRequestContext();
    const kv = (env as Record<string, unknown>).RATE_LIMIT_KV as KVNamespace | undefined;
    if (!kv) return true; // KV未設定時はスキップ

    const ip =
      req.headers.get("CF-Connecting-IP") ||
      req.headers.get("X-Forwarded-For")?.split(",")[0].trim() ||
      "unknown";
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `rl:${ip}:${today}`;

    const countStr = await kv.get(key);
    const count = countStr ? parseInt(countStr, 10) : 0;

    if (count >= 5) return false; // 上限超過

    await kv.put(key, String(count + 1), { expirationTtl: 90000 }); // 25時間で自動削除
    return true;
  } catch {
    return true; // エラー時はスキップ（ローカル開発など）
  }
}

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  ja: "必ず日本語のみでレビュー文を書いてください。他の言語は使わないでください。",
  en: "Write the review in English ONLY. Do not use any other language.",
  zh: "请只用中文写评价。不要使用其他语言。",
  ko: "반드시 한국어로만 리뷰를 작성하세요. 다른 언어는 사용하지 마세요.",
  vi: "Chỉ viết bằng tiếng Việt. Không dùng ngôn ngữ khác.",
  th: "เขียนรีวิวเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาอื่น",
};

const LANGUAGE_EXAMPLES: Record<string, string> = {
  ja: "例: 立地も良く、部屋も清潔で快適に過ごせました。ホストの対応も丁寧で、また利用したいと思います。",
  en: "Example: Great location and clean rooms. The host was very responsive and helpful. Will definitely stay again!",
  zh: "示例: 位置很好，房间干净整洁，房东服务周到，下次一定还来住！",
  ko: "예시: 위치도 좋고 방도 깨끗해서 편안하게 지낼 수 있었습니다. 호스트 분도 친절하셔서 또 이용하고 싶습니다.",
  vi: "Ví dụ: Vị trí thuận tiện, phòng sạch sẽ và thoải mái. Chủ nhà rất nhiệt tình, tôi chắc chắn sẽ quay lại!",
  th: "ตัวอย่าง: ที่พักสะอาดมาก ทำเลดี ใกล้รถไฟฟ้า เจ้าของบ้านใจดีและให้ความช่วยเหลือดีมาก จะกลับมาพักอีกแน่นอน",
};

export async function POST(req: NextRequest) {
  const allowed = await checkRateLimit(req);
  if (!allowed) {
    return NextResponse.json(
      { error: "本日の利用回数の上限（5回）に達しました。明日またお試しください。" },
      { status: 429 }
    );
  }

  try {
    const { notes, language, rating, answers } = await req.json() as {
      notes: string;
      language: string;
      rating: number;
      answers: [string, string, string, string];
    };

    const hasContent =
      (notes && notes.trim().length > 0) ||
      (Array.isArray(answers) && answers.some((a) => a && a.trim().length > 0));

    if (!hasContent) {
      return NextResponse.json(
        { error: "質問への回答か感想を入力してください" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "APIキーが設定されていません" },
        { status: 500 }
      );
    }

    const lang = language || "ja";
    const stars = rating || 5;

    const [purpose, highlight, revisit, origin] = Array.isArray(answers)
      ? answers
      : ["", "", "", ""];

    const selectionInfo = [
      purpose   ? `- 宿泊目的: ${purpose}` : null,
      highlight ? `- 特に良かった点: ${highlight}` : null,
      revisit   ? `- 再訪意向: ${revisit}` : null,
      origin    ? `- 出発地・お住まい: ${origin}` : null,
      notes && notes.trim() ? `- 追記メモ: ${notes.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `You are a professional review writer for a minpaku (short-term rental) hotel.
Generate one natural and realistic guest review based on the information below.

OUTPUT LANGUAGE RULE (CRITICAL): ${LANGUAGE_INSTRUCTIONS[lang]}

About the property:
- Name: L-STAY HOTEL
- Location: Aichi, Japan (near Nagoya)
- Features: Clean rooms, good access, homey atmosphere, suitable for long stays

Guest input:
- Rating: ${stars} out of 5 stars
${selectionInfo}

Output instructions:
- Length: 100-200 characters in Japanese/Korean/Thai, 50-100 words in English/Chinese/Vietnamese
- Write in a natural, authentic guest voice
- Avoid excessive marketing language
- Naturally incorporate the selected information
- Example style: ${LANGUAGE_EXAMPLES[lang]}
- Output the review text ONLY — no introduction, no explanation`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI error:", err);
      return NextResponse.json(
        { error: `OpenAI error ${response.status}: ${err.slice(0, 200)}` },
        { status: 500 }
      );
    }

    const data = await response.json() as {
      choices: { message: { content: string } }[];
    };
    const review = data.choices[0]?.message?.content?.trim();

    if (!review) {
      return NextResponse.json(
        { error: "レビューの生成に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Error generating review:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
