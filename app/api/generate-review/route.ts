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

    const bypassIps = (env as Record<string, unknown>).RATE_LIMIT_BYPASS_IPS as string | undefined;
    if (bypassIps && bypassIps.split(",").map(s => s.trim()).includes(ip)) return true;

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
  th: "เขียนรีวิวเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาอื่น",
};

const STYLE_VARIANTS: Record<string, string[]> = {
  ja: [
    "タメ口気味の短いメモ風（80〜120字）",
    "「〜したよ」「〜だったな」など話し言葉を交えた友人への報告風（100〜150字）",
    "具体的なエピソードを1つ入れた体験談風（130〜180字）",
    "良かった点を2〜3個具体的に書く詳細レビュー風（150〜200字）",
    "正直に良い点と普通だった点を1つずつ挙げたバランス型（130〜170字）",
    "チェックイン後の様子から書き始める旅行記風（120〜160字）",
  ],
  en: [
    "short and casual, like a quick note (40-60 words)",
    "conversational, like telling a friend about the trip (60-80 words)",
    "specific with one concrete detail or memory (55-75 words)",
    "honest with a minor neutral note alongside the positives (65-85 words)",
    "brief narrative starting from the moment of arrival (50-70 words)",
    "comparison-based: better or different than expected (55-75 words)",
  ],
  zh: [
    "简短随意风格（50〜80字）",
    "朋友间对话风格（70〜100字）",
    "包含一个具体细节的体验分享（80〜110字）",
    "正面评价搭配一个中立观察（75〜100字）",
    "从入住过程写起的游记风格（70〜95字）",
  ],
  ko: [
    "짧고 캐주얼한 메모 스타일（50〜80자）",
    "친구에게 이야기하듯 대화체（70〜100자）",
    "구체적인 에피소드 하나를 포함한 체험담（90〜120자）",
    "좋은 점과 평범한 점 각각 하나씩 솔직한 리뷰（80〜110자）",
    "체크인부터 시작하는 여행기 스타일（70〜100자）",
  ],
  th: [
    "สั้นและสบายๆ (40-60 คำ)",
    "เหมือนเล่าให้เพื่อนฟัง (60-80 คำ)",
    "มีรายละเอียดเฉพาะหนึ่งอย่าง (50-70 คำ)",
    "ซื่อสัตย์ มีทั้งจุดดีและข้อสังเกตกลางๆ (55-75 คำ)",
    "เริ่มจากตอนเช็คอิน (45-65 คำ)",
  ],
};

const FORBIDDEN_PHRASES: Record<string, string> = {
  ja: "「また利用したいと思います」「ホストの対応も丁寧で」「快適に過ごせました」「ぜひおすすめです」「最高でした」「5つ星」「スタッフも親切」",
  en: "\"highly recommend\", \"five stars\", \"10/10\", \"definitely recommend\", \"perfect stay\", \"couldn't be happier\", \"above and beyond\", \"exceeded expectations\"",
  zh: "「强力推荐」「五星好评」「完美」「非常推荐」「性价比超高」「服务周到」",
  ko: "「강력 추천합니다」「완벽한 숙박」「최고의 숙소」「무조건 추천」「꼭 가보세요」「친절한 호스트」",
  th: "\"แนะนำอย่างยิ่ง\" \"ห้าดาว\" \"สมบูรณ์แบบ\" \"เกินความคาดหมาย\" \"บริการดีเยี่ยม\"",
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
      answers: [string, string, string, string, string, string];
    };

    if (!notes || !notes.trim()) {
      return NextResponse.json(
        { error: "コメントを入力してください" },
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

    const [purpose, highlight, revisit, origin, guests, recommend] = Array.isArray(answers)
      ? answers
      : ["", "", "", "", "", ""];

    const selectionInfo = [
      purpose    ? `- 宿泊目的: ${purpose}` : null,
      highlight  ? `- 特に良かった点: ${highlight}` : null,
      revisit    ? `- 再訪意向: ${revisit}` : null,
      origin     ? `- 出発地: ${origin}` : null,
      guests     ? `- 人数: ${guests}` : null,
      recommend  ? `- 友人への推薦意向: ${recommend}` : null,
      `- コメント: ${notes.trim()}`,
    ]
      .filter(Boolean)
      .join("\n");

    const styleOptions = STYLE_VARIANTS[lang] ?? STYLE_VARIANTS["ja"];
    const styleHint = styleOptions[Math.floor(Math.random() * styleOptions.length)];
    const forbiddenPhrases = FORBIDDEN_PHRASES[lang] ?? FORBIDDEN_PHRASES["ja"];

    const prompt = `You are helping a real hotel guest write their own Google review in their own words.
Generate one genuine, human-sounding review based on the guest's input below.

LANGUAGE RULE (CRITICAL): ${LANGUAGE_INSTRUCTIONS[lang] ?? LANGUAGE_INSTRUCTIONS["ja"]}

Hotel: L-STAY HOTEL — a compact guesthouse in Aichi, Japan (near Nagoya city center).

Guest data:
- Stars: ${stars}/5
${selectionInfo}

Writing style for THIS review: ${styleHint}

Rules to avoid sounding like AI-generated text:
1. NEVER use these phrases: ${forbiddenPhrases}
2. Include at least one concrete specific detail (a particular item, observation, or moment)
3. Use natural, slightly informal language — NOT polished or corporate-sounding
4. Vary sentence length: mix short punchy lines with slightly longer ones
5. It is realistic and fine to include one minor neutral observation (e.g. "parking was paid" or "elevator was small")
6. Do NOT enumerate features mechanically — weave them into natural sentences
7. End in a variety of ways — not always with a recommendation statement
8. Do NOT start multiple sentences the same way

Output the review text ONLY — no prefix, no label, no explanation.`;

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
        temperature: 1.0,
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
