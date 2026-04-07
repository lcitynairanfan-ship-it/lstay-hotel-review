"use client";

import { useState } from "react";

const LANGUAGES = [
  { code: "ja", label: "日本語",   flag: "🇯🇵" },
  { code: "en", label: "English",  flag: "🇺🇸" },
  { code: "zh", label: "中文",     flag: "🇨🇳" },
  { code: "ko", label: "한국어",   flag: "🇰🇷" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", label: "ภาษาไทย",  flag: "🇹🇭" },
] as const;

type LangCode = "ja" | "en" | "zh" | "ko" | "vi" | "th";

const GOOGLE_REVIEW_URL = "https://search.google.com/local/writereview?placeid=ChIJc_cJI_5xA2ARrOoMZIhxjcw";

const RATING_LABELS: Record<LangCode, string[]> = {
  ja: ["最悪", "悪い", "普通", "良い", "最高"],
  en: ["Terrible", "Bad", "Okay", "Good", "Excellent"],
  zh: ["很差", "差", "一般", "好", "非常好"],
  ko: ["최악", "나쁨", "보통", "좋음", "최고"],
  vi: ["Tệ", "Kém", "Bình thường", "Tốt", "Xuất sắc"],
  th: ["แย่มาก", "แย่", "ปานกลาง", "ดี", "ดีมาก"],
};

const PLACEHOLDERS: Record<LangCode, string> = {
  ja: "例：部屋が清潔で、駅から近くて便利でした。（任意）",
  en: "e.g. The room was clean and close to the station. (optional)",
  zh: "例：房间干净，离地铁站很近。（可选）",
  ko: "예: 방이 깨끗하고 역에서 가까워 편리했습니다. (선택사항)",
  vi: "Ví dụ: Phòng sạch sẽ, gần ga tàu. (tùy chọn)",
  th: "เช่น ห้องสะอาดมาก อยู่ใกล้สถานีรถไฟ (ไม่บังคับ)",
};

const SNS_SHARE_TEXT: Record<LangCode, string> = {
  ja: "L-STAY HOTELに泊まりました！",
  en: "I stayed at L-STAY HOTEL!",
  zh: "我住了L-STAY HOTEL！",
  ko: "L-STAY HOTEL에 묵었습니다!",
  vi: "Tôi đã ở tại L-STAY HOTEL!",
  th: "ฉันพักที่ L-STAY HOTEL!",
};

interface QuestionDef {
  label: string;
  options: { value: string; label: string }[];
}

const QUESTIONS: Record<LangCode, [QuestionDef, QuestionDef, QuestionDef, QuestionDef]> = {
  ja: [
    {
      label: "宿泊目的",
      options: [
        { value: "観光", label: "🗺️ 観光" },
        { value: "出張", label: "💼 出張" },
        { value: "長期滞在", label: "🏠 長期滞在" },
        { value: "その他", label: "✦ その他" },
      ],
    },
    {
      label: "特に良かった点",
      options: [
        { value: "清潔さ", label: "✨ 清潔さ" },
        { value: "アクセス・立地", label: "📍 アクセス・立地" },
        { value: "使い方がわかりやすかった", label: "🗝️ 使い方がわかりやすい" },
        { value: "設備・アメニティ", label: "🛋️ 設備・アメニティ" },
      ],
    },
    {
      label: "また利用したいですか？",
      options: [
        { value: "ぜひまた来たい", label: "⭐ ぜひまた来たい" },
        { value: "機会があれば", label: "👍 機会があれば" },
        { value: "わからない", label: "🤔 わからない" },
      ],
    },
    {
      label: "どちらからお越しですか？",
      options: [
        { value: "愛知・東海", label: "🗾 愛知・東海" },
        { value: "北海道・東北", label: "🌨️ 北海道・東北" },
        { value: "関東（東京など）", label: "🗼 関東" },
        { value: "関西（大阪・京都など）", label: "⛩️ 関西" },
        { value: "中国・四国", label: "🌊 中国・四国" },
        { value: "九州・沖縄", label: "🌺 九州・沖縄" },
        { value: "韓国", label: "🇰🇷 韓国" },
        { value: "中国", label: "🇨🇳 中国" },
        { value: "東南アジア", label: "🌏 東南アジア" },
        { value: "その他海外", label: "✈️ その他海外" },
      ],
    },
  ],
  en: [
    {
      label: "Purpose of Stay",
      options: [
        { value: "Tourism", label: "🗺️ Tourism" },
        { value: "Business", label: "💼 Business" },
        { value: "Extended Stay", label: "🏠 Extended Stay" },
        { value: "Other", label: "✦ Other" },
      ],
    },
    {
      label: "Best Aspect",
      options: [
        { value: "Cleanliness", label: "✨ Cleanliness" },
        { value: "Location & Access", label: "📍 Location & Access" },
        { value: "Easy to use & clear guide", label: "🗝️ Easy to use" },
        { value: "Facilities & Amenities", label: "🛋️ Facilities & Amenities" },
      ],
    },
    {
      label: "Would You Stay Again?",
      options: [
        { value: "Definitely", label: "⭐ Definitely" },
        { value: "If the opportunity arises", label: "👍 If the opportunity arises" },
        { value: "Not sure", label: "🤔 Not sure" },
      ],
    },
    {
      label: "Where are you from?",
      options: [
        { value: "Aichi / Tokai", label: "🗾 Aichi / Tokai" },
        { value: "Hokkaido / Tohoku", label: "🌨️ Hokkaido / Tohoku" },
        { value: "Kanto (Tokyo area)", label: "🗼 Kanto (Tokyo)" },
        { value: "Kansai (Osaka / Kyoto)", label: "⛩️ Kansai" },
        { value: "Chugoku / Shikoku", label: "🌊 Chugoku / Shikoku" },
        { value: "Kyushu / Okinawa", label: "🌺 Kyushu / Okinawa" },
        { value: "Korea", label: "🇰🇷 Korea" },
        { value: "China / Taiwan", label: "🇨🇳 China / Taiwan" },
        { value: "Southeast Asia", label: "🌏 Southeast Asia" },
        { value: "Other overseas", label: "✈️ Other overseas" },
      ],
    },
  ],
  zh: [
    {
      label: "住宿目的",
      options: [
        { value: "观光旅游", label: "🗺️ 观光旅游" },
        { value: "商务出差", label: "💼 商务出差" },
        { value: "长期居住", label: "🏠 长期居住" },
        { value: "其他", label: "✦ 其他" },
      ],
    },
    {
      label: "最满意的地方",
      options: [
        { value: "干净整洁", label: "✨ 干净整洁" },
        { value: "交通位置", label: "📍 交通位置" },
        { value: "使用说明清晰易懂", label: "🗝️ 说明清晰易懂" },
        { value: "设施设备", label: "🛋️ 设施设备" },
      ],
    },
    {
      label: "是否会再次入住？",
      options: [
        { value: "一定会再来", label: "⭐ 一定会再来" },
        { value: "有机会的话", label: "👍 有机会的话" },
        { value: "不确定", label: "🤔 不确定" },
      ],
    },
    {
      label: "您从哪里来？",
      options: [
        { value: "爱知・东海", label: "🗾 爱知・东海" },
        { value: "北海道・东北", label: "🌨️ 北海道・东北" },
        { value: "关东（东京等）", label: "🗼 关东" },
        { value: "关西（大阪・京都等）", label: "⛩️ 关西" },
        { value: "中国地方・四国", label: "🌊 中国・四国" },
        { value: "九州・冲绳", label: "🌺 九州・冲绳" },
        { value: "韩国", label: "🇰🇷 韩国" },
        { value: "中国大陆", label: "🇨🇳 中国" },
        { value: "东南亚", label: "🌏 东南亚" },
        { value: "其他海外", label: "✈️ 其他海外" },
      ],
    },
  ],
  ko: [
    {
      label: "숙박 목적",
      options: [
        { value: "관광", label: "🗺️ 관광" },
        { value: "출장", label: "💼 출장" },
        { value: "장기 체류", label: "🏠 장기 체류" },
        { value: "기타", label: "✦ 기타" },
      ],
    },
    {
      label: "가장 좋았던 점",
      options: [
        { value: "청결함", label: "✨ 청결함" },
        { value: "접근성·위치", label: "📍 접근성·위치" },
        { value: "이용 방법이 알기 쉬웠다", label: "🗝️ 이용법이 알기 쉬움" },
        { value: "시설·어메니티", label: "🛋️ 시설·어메니티" },
      ],
    },
    {
      label: "다시 이용하시겠어요?",
      options: [
        { value: "꼭 다시 오고 싶다", label: "⭐ 꼭 다시 오고 싶다" },
        { value: "기회가 된다면", label: "👍 기회가 된다면" },
        { value: "모르겠다", label: "🤔 모르겠다" },
      ],
    },
    {
      label: "어디서 오셨나요?",
      options: [
        { value: "아이치·도카이", label: "🗾 아이치·도카이" },
        { value: "홋카이도·도호쿠", label: "🌨️ 홋카이도·도호쿠" },
        { value: "간토（도쿄 등）", label: "🗼 간토" },
        { value: "간사이（오사카·교토 등）", label: "⛩️ 간사이" },
        { value: "주고쿠·시코쿠", label: "🌊 주고쿠·시코쿠" },
        { value: "규슈·오키나와", label: "🌺 규슈·오키나와" },
        { value: "한국", label: "🇰🇷 한국" },
        { value: "중국", label: "🇨🇳 중국" },
        { value: "동남아시아", label: "🌏 동남아시아" },
        { value: "기타 해외", label: "✈️ 기타 해외" },
      ],
    },
  ],
  vi: [
    {
      label: "Mục đích lưu trú",
      options: [
        { value: "Du lịch", label: "🗺️ Du lịch" },
        { value: "Công tác", label: "💼 Công tác" },
        { value: "Lưu trú dài hạn", label: "🏠 Lưu trú dài hạn" },
        { value: "Khác", label: "✦ Khác" },
      ],
    },
    {
      label: "Điểm nổi bật nhất",
      options: [
        { value: "Sạch sẽ", label: "✨ Sạch sẽ" },
        { value: "Vị trí thuận tiện", label: "📍 Vị trí thuận tiện" },
        { value: "Hướng dẫn sử dụng rõ ràng", label: "🗝️ Hướng dẫn rõ ràng" },
        { value: "Tiện nghi", label: "🛋️ Tiện nghi" },
      ],
    },
    {
      label: "Bạn có muốn quay lại không?",
      options: [
        { value: "Chắc chắn sẽ quay lại", label: "⭐ Chắc chắn sẽ quay lại" },
        { value: "Nếu có cơ hội", label: "👍 Nếu có cơ hội" },
        { value: "Chưa chắc", label: "🤔 Chưa chắc" },
      ],
    },
    {
      label: "Bạn đến từ đâu?",
      options: [
        { value: "Aichi・Tokai", label: "🗾 Aichi・Tokai" },
        { value: "Hokkaido・Tohoku", label: "🌨️ Hokkaido・Tohoku" },
        { value: "Kanto（Tokyo v.v.）", label: "🗼 Kanto" },
        { value: "Kansai（Osaka・Kyoto v.v.）", label: "⛩️ Kansai" },
        { value: "Chugoku・Shikoku", label: "🌊 Chugoku・Shikoku" },
        { value: "Kyushu・Okinawa", label: "🌺 Kyushu・Okinawa" },
        { value: "Hàn Quốc", label: "🇰🇷 Hàn Quốc" },
        { value: "Trung Quốc", label: "🇨🇳 Trung Quốc" },
        { value: "Đông Nam Á", label: "🌏 Đông Nam Á" },
        { value: "Nước ngoài khác", label: "✈️ Nước ngoài khác" },
      ],
    },
  ],
  th: [
    {
      label: "วัตถุประสงค์การเข้าพัก",
      options: [
        { value: "ท่องเที่ยว", label: "🗺️ ท่องเที่ยว" },
        { value: "ธุรกิจ", label: "💼 ธุรกิจ" },
        { value: "พักระยะยาว", label: "🏠 พักระยะยาว" },
        { value: "อื่นๆ", label: "✦ อื่นๆ" },
      ],
    },
    {
      label: "จุดเด่นที่ชื่นชอบ",
      options: [
        { value: "ความสะอาด", label: "✨ ความสะอาด" },
        { value: "ทำเลที่ตั้ง", label: "📍 ทำเลที่ตั้ง" },
        { value: "คู่มือใช้งานเข้าใจง่าย", label: "🗝️ คู่มือเข้าใจง่าย" },
        { value: "สิ่งอำนวยความสะดวก", label: "🛋️ สิ่งอำนวยความสะดวก" },
      ],
    },
    {
      label: "คุณจะกลับมาพักอีกไหม?",
      options: [
        { value: "อยากกลับมาแน่นอน", label: "⭐ อยากกลับมาแน่นอน" },
        { value: "ถ้ามีโอกาส", label: "👍 ถ้ามีโอกาส" },
        { value: "ยังไม่แน่ใจ", label: "🤔 ยังไม่แน่ใจ" },
      ],
    },
    {
      label: "คุณมาจากไหน?",
      options: [
        { value: "ไอจิ・โทไก", label: "🗾 ไอจิ・โทไก" },
        { value: "ฮอกไกโด・โทโฮคุ", label: "🌨️ ฮอกไกโด・โทโฮคุ" },
        { value: "คันโต（โตเกียว ฯลฯ）", label: "🗼 คันโต" },
        { value: "คันไซ（โอซาก้า・เกียวโต ฯลฯ）", label: "⛩️ คันไซ" },
        { value: "ชูโกคุ・ชิโกคุ", label: "🌊 ชูโกคุ・ชิโกคุ" },
        { value: "คิวชู・โอกินาวา", label: "🌺 คิวชู・โอกินาวา" },
        { value: "เกาหลี", label: "🇰🇷 เกาหลี" },
        { value: "จีน", label: "🇨🇳 จีน" },
        { value: "เอเชียตะวันออกเฉียงใต้", label: "🌏 เอเชียตะวันออกเฉียงใต้" },
        { value: "ต่างประเทศอื่นๆ", label: "✈️ ต่างประเทศอื่นๆ" },
      ],
    },
  ],
};

const LABELS: Record<LangCode, Record<string, string>> = {
  ja: {
    subtitle: "ご宿泊の感想を入力するだけで、レビュー文を自動生成します",
    rating: "総合評価",
    notes: "感想・メモ（任意）",
    chars: "文字",
    generate: "レビューを生成する",
    generating: "生成中...",
    result: "生成されたレビュー",
    regenerate: "もう一度生成する",
    placeholder_hint: "宿泊目的か感想を選択・入力してください",
    google_btn: "Googleレビューに投稿する",
    auto_copied: "✓ レビュー文をコピーしました — 貼り付けてご投稿ください",
  },
  en: {
    subtitle: "Enter your impressions and we'll craft a polished review for you",
    rating: "Overall Rating",
    notes: "Your Notes (optional)",
    chars: "chars",
    generate: "Generate Review",
    generating: "Generating...",
    result: "Generated Review",
    regenerate: "Regenerate",
    placeholder_hint: "Please select at least one option above",
    google_btn: "Post to Google Reviews",
    auto_copied: "✓ Review copied — paste it on Google",
  },
  zh: {
    subtitle: "输入您的感想，AI自动生成精美评价文",
    rating: "综合评分",
    notes: "您的感想（可选）",
    chars: "字",
    generate: "生成评价",
    generating: "生成中...",
    result: "生成的评价",
    regenerate: "重新生成",
    placeholder_hint: "请至少选择一个选项",
    google_btn: "发布到Google评价",
    auto_copied: "✓ 评价已复制 — 请粘贴到Google",
  },
  ko: {
    subtitle: "숙박 감상을 입력하면 AI가 리뷰를 자동 생성합니다",
    rating: "종합 평가",
    notes: "감상 메모 (선택사항)",
    chars: "자",
    generate: "리뷰 생성하기",
    generating: "생성 중...",
    result: "생성된 리뷰",
    regenerate: "다시 생성하기",
    placeholder_hint: "위 항목 중 하나 이상을 선택해 주세요",
    google_btn: "Google 리뷰에 게시하기",
    auto_copied: "✓ 리뷰가 복사되었습니다 — Google에 붙여넣기 하세요",
  },
  vi: {
    subtitle: "Nhập cảm nhận của bạn, AI sẽ tạo bài đánh giá hoàn chỉnh",
    rating: "Đánh giá tổng thể",
    notes: "Ghi chú của bạn (tùy chọn)",
    chars: "ký tự",
    generate: "Tạo đánh giá",
    generating: "Đang tạo...",
    result: "Đánh giá đã tạo",
    regenerate: "Tạo lại",
    placeholder_hint: "Vui lòng chọn ít nhất một mục ở trên",
    google_btn: "Đăng lên Google Reviews",
    auto_copied: "✓ Đã sao chép — Dán vào Google để đăng",
  },
  th: {
    subtitle: "กรอกความรู้สึกของคุณ แล้ว AI จะสร้างรีวิวให้อัตโนมัติ",
    rating: "คะแนนโดยรวม",
    notes: "บันทึกของคุณ (ไม่บังคับ)",
    chars: "ตัวอักษร",
    generate: "สร้างรีวิว",
    generating: "กำลังสร้าง...",
    result: "รีวิวที่สร้างแล้ว",
    regenerate: "สร้างใหม่",
    placeholder_hint: "กรุณาเลือกอย่างน้อยหนึ่งตัวเลือกด้านบน",
    google_btn: "โพสต์ไปยัง Google Reviews",
    auto_copied: "✓ คัดลอกแล้ว — วางลงใน Google เพื่อโพสต์",
  },
};

export default function Home() {
  const [notes, setNotes] = useState("");
  const [language, setLanguage] = useState<LangCode>("ja");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [autoCopied, setAutoCopied] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [answers, setAnswers] = useState<[string, string, string, string]>(["", "", "", ""]);

  const t = LABELS[language];
  const questions = QUESTIONS[language];

  const setAnswer = (idx: 0 | 1 | 2 | 3, value: string) => {
    setAnswers((prev) => {
      const next: [string, string, string, string] = [...prev] as [string, string, string, string];
      next[idx] = value;
      return next;
    });
  };

  const hasInput = answers.some((a) => a !== "") || notes.trim().length > 0;

  const generateReview = async () => {
    if (!hasInput) {
      setError(t.placeholder_hint);
      return;
    }
    setLoading(true);
    setError("");
    setReview("");
    setAutoCopied(false);
    try {
      const res = await fetch("/api/generate-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, language, rating, answers }),
      });
      const data: { review?: string; error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "エラーが発生しました");
      const generated = data.review ?? "";
      setReview(generated);
      // Auto-copy
      try {
        await navigator.clipboard.writeText(generated);
        setAutoCopied(true);
      } catch {
        // clipboard may be blocked; user can copy manually
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!review) return;
    await navigator.clipboard.writeText(review);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoogleReview = async () => {
    if (review) {
      try {
        await navigator.clipboard.writeText(review);
        setAutoCopied(true);
      } catch {
        // ignore
      }
    }
    window.open(GOOGLE_REVIEW_URL, "_blank");
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`${SNS_SHARE_TEXT[language]}\n\n${review}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  const handleLineShare = () => {
    const text = encodeURIComponent(`${SNS_SHARE_TEXT[language]}\n\n${review}`);
    window.open(`https://social-plugins.line.me/lineit/share?url=https://lstay.hotel&text=${text}`, "_blank");
  };

  const currentRating = hoverRating || rating;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Noto+Sans+JP:wght@300;400;500&family=Noto+Sans+KR:wght@300;400&family=Noto+Sans+SC:wght@300;400&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0d0d0d;
          color: #f0ebe2;
        }

        .page-wrapper {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          font-family: 'Noto Sans JP', sans-serif;
        }

        /* ── 背景画像 ── */
        .bg-layer {
          position: fixed;
          inset: 0;
          background-image: url('/haikei.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          z-index: 0;
        }
        .bg-layer::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 50% 40%, #2a2a2a 0%, #111 50%, #080808 100%);
        }
        .bg-layer::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(135deg, rgba(201,168,76,0.18) 0%, transparent 35%),
            linear-gradient(225deg, rgba(201,168,76,0.12) 0%, transparent 35%),
            linear-gradient(315deg, rgba(201,168,76,0.18) 0%, transparent 40%);
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          z-index: 1;
        }

        .content {
          position: relative;
          z-index: 2;
        }

        /* ── ヘッダー ── */
        .header {
          border-bottom: 1px solid rgba(201,168,76,0.2);
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .header-inner {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 24px;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .logo-main {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 22px;
          font-weight: 600;
          color: #c9a84c;
          letter-spacing: 6px;
          text-transform: uppercase;
        }
        .logo-sep { color: rgba(201,168,76,0.3); font-size: 20px; }
        .logo-sub {
          color: rgba(201,168,76,0.6);
          font-size: 10px;
          letter-spacing: 3px;
          font-weight: 300;
        }

        .lang-buttons {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .lang-btn {
          padding: 4px 10px;
          font-size: 11px;
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          font-family: inherit;
        }
        .lang-btn.active {
          border: 1px solid #c9a84c;
          background: rgba(201,168,76,0.15);
          color: #c9a84c;
        }
        .lang-btn:not(.active) {
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.45);
        }
        .lang-btn:hover:not(.active) {
          border-color: rgba(201,168,76,0.4);
          color: rgba(201,168,76,0.7);
        }

        /* ── ヒーロー ── */
        .hero {
          text-align: center;
          padding: 70px 24px 50px;
        }
        .hero-badge {
          display: inline-block;
          font-size: 10px;
          letter-spacing: 6px;
          color: #c9a84c;
          border: 1px solid rgba(201,168,76,0.3);
          padding: 6px 20px;
          margin-bottom: 28px;
          font-weight: 300;
        }
        .hero-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(28px, 5vw, 48px);
          font-weight: 400;
          letter-spacing: 4px;
          line-height: 1.3;
          margin-bottom: 16px;
          color: #f5f0e8;
        }
        .hero-title span {
          color: #c9a84c;
          font-style: italic;
        }
        .hero-sub {
          color: rgba(240,235,226,0.5);
          font-size: 13px;
          letter-spacing: 1px;
          font-weight: 300;
          max-width: 500px;
          margin: 0 auto;
          line-height: 1.8;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 16px;
          max-width: 300px;
          margin: 24px auto 0;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent);
        }
        .divider-diamond {
          width: 6px;
          height: 6px;
          background: #c9a84c;
          transform: rotate(45deg);
        }

        /* ── メインカード ── */
        .main {
          max-width: 680px;
          margin: 0 auto;
          padding: 0 24px 60px;
        }

        .card {
          background: rgba(10,10,10,0.75);
          border: 1px solid rgba(201,168,76,0.2);
          border-radius: 2px;
          padding: 40px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,168,76,0.1);
        }

        .field-label {
          display: block;
          font-size: 10px;
          letter-spacing: 4px;
          color: #c9a84c;
          margin-bottom: 16px;
          font-weight: 300;
          text-transform: uppercase;
        }

        /* 星評価 */
        .rating-wrap { margin-bottom: 36px; }
        .stars { display: flex; align-items: center; gap: 6px; }
        .star-btn {
          font-size: 28px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          transition: all 0.15s;
        }
        .star-btn.on  { color: #c9a84c; transform: scale(1.15); filter: drop-shadow(0 0 6px rgba(201,168,76,0.6)); }
        .star-btn.off { color: rgba(255,255,255,0.1); }
        .rating-text {
          margin-left: 14px;
          color: #c9a84c;
          font-size: 13px;
          font-weight: 300;
          font-family: 'Cormorant Garamond', serif;
          letter-spacing: 2px;
        }

        /* 選択式質問 */
        .question-wrap { margin-bottom: 28px; }
        .options-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .option-btn {
          padding: 8px 16px;
          font-size: 12px;
          border-radius: 2px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          letter-spacing: 0.5px;
        }
        .option-btn.selected {
          border: 1px solid #c9a84c;
          background: rgba(201,168,76,0.18);
          color: #c9a84c;
        }
        .option-btn:not(.selected) {
          border: 1px solid rgba(255,255,255,0.12);
          background: transparent;
          color: rgba(255,255,255,0.5);
        }
        .option-btn:not(.selected):hover {
          border-color: rgba(201,168,76,0.35);
          color: rgba(201,168,76,0.7);
          background: rgba(201,168,76,0.06);
        }

        /* テキストエリア */
        .notes-wrap { margin-bottom: 28px; }
        .notes-textarea {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(201,168,76,0.15);
          border-radius: 2px;
          color: #f0ebe2;
          font-size: 14px;
          padding: 18px;
          resize: vertical;
          outline: none;
          line-height: 1.9;
          font-family: inherit;
          transition: border-color 0.25s, background 0.25s;
        }
        .notes-textarea::placeholder { color: rgba(240,235,226,0.25); }
        .notes-textarea:focus {
          border-color: rgba(201,168,76,0.5);
          background: rgba(255,255,255,0.06);
        }
        .char-count { text-align: right; margin-top: 6px; font-size: 11px; color: rgba(255,255,255,0.25); }

        /* エラー */
        .error-box {
          background: rgba(220,38,38,0.08);
          border: 1px solid rgba(220,38,38,0.25);
          border-radius: 2px;
          padding: 12px 16px;
          margin-bottom: 20px;
          color: #fca5a5;
          font-size: 13px;
        }

        /* 生成ボタン */
        .generate-btn {
          width: 100%;
          padding: 18px;
          border: none;
          border-radius: 2px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 4px;
          cursor: pointer;
          transition: all 0.3s;
          font-family: inherit;
          text-transform: uppercase;
          position: relative;
          overflow: hidden;
        }
        .generate-btn:not(:disabled) {
          background: linear-gradient(135deg, #c9a84c 0%, #e8c96a 50%, #a8872e 100%);
          color: #1a1100;
          box-shadow: 0 4px 20px rgba(201,168,76,0.3);
        }
        .generate-btn:not(:disabled):hover {
          box-shadow: 0 6px 28px rgba(201,168,76,0.5);
          transform: translateY(-1px);
        }
        .generate-btn:disabled {
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.3);
          cursor: not-allowed;
        }

        /* 結果エリア */
        .result-wrap { margin-top: 36px; }
        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .action-buttons { display: flex; gap: 6px; }
        .action-btn {
          padding: 6px 14px;
          font-size: 10px;
          letter-spacing: 2px;
          border-radius: 2px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          text-transform: uppercase;
        }
        .action-btn.copy {
          border: 1px solid rgba(201,168,76,0.3);
          background: transparent;
          color: rgba(201,168,76,0.7);
        }
        .action-btn.copy.done {
          border-color: #c9a84c;
          background: rgba(201,168,76,0.15);
          color: #c9a84c;
        }
        .action-btn.sns {
          border: 1px solid rgba(255,255,255,0.12);
          background: transparent;
          color: rgba(255,255,255,0.4);
        }
        .action-btn:hover { opacity: 0.8; }

        .review-box {
          background: rgba(201,168,76,0.04);
          border: 1px solid rgba(201,168,76,0.2);
          border-left: 3px solid #c9a84c;
          border-radius: 2px;
          padding: 28px;
          line-height: 2;
          font-size: 14px;
          color: #e8e0d0;
          white-space: pre-wrap;
          box-shadow: inset 0 0 40px rgba(201,168,76,0.03);
        }
        .review-stars { margin-bottom: 14px; }

        /* 自動コピー通知 */
        .auto-copy-notice {
          margin-top: 12px;
          padding: 10px 16px;
          background: rgba(201,168,76,0.08);
          border: 1px solid rgba(201,168,76,0.25);
          border-radius: 2px;
          font-size: 12px;
          color: rgba(201,168,76,0.9);
          letter-spacing: 0.5px;
          text-align: center;
        }

        /* Googleレビューボタン */
        .google-btn {
          margin-top: 14px;
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 2px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 3px;
          cursor: pointer;
          font-family: inherit;
          text-transform: uppercase;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%);
          color: #fff;
          box-shadow: 0 4px 20px rgba(26,115,232,0.3);
        }
        .google-btn:hover {
          box-shadow: 0 6px 28px rgba(26,115,232,0.5);
          transform: translateY(-1px);
        }
        .google-icon {
          font-size: 16px;
        }

        .regen-btn {
          margin-top: 10px;
          width: 100%;
          padding: 12px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 2px;
          color: rgba(255,255,255,0.3);
          font-size: 10px;
          cursor: pointer;
          letter-spacing: 3px;
          font-family: inherit;
          text-transform: uppercase;
          transition: all 0.2s;
        }
        .regen-btn:hover { border-color: rgba(201,168,76,0.3); color: rgba(201,168,76,0.6); }

        /* フッター */
        .footer {
          border-top: 1px solid rgba(201,168,76,0.1);
          padding: 28px 24px;
          text-align: center;
          background: rgba(0,0,0,0.5);
          position: relative;
          z-index: 2;
        }
        .footer p { color: rgba(255,255,255,0.2); font-size: 11px; letter-spacing: 3px; }
        .footer span { color: rgba(201,168,76,0.6); }

        /* ── モバイル最適化 ── */
        @media (max-width: 600px) {
          /* タップ操作の誤爆防止 */
          * { -webkit-tap-highlight-color: transparent; }

          .header-inner {
            flex-direction: column;
            height: auto;
            padding: 10px 12px;
            gap: 8px;
          }
          .logo-main { font-size: 18px; letter-spacing: 4px; }
          .logo-sub { font-size: 9px; }
          .lang-buttons { justify-content: center; gap: 5px; }
          .lang-btn { padding: 6px 10px; font-size: 12px; min-height: 36px; }

          .hero { padding: 28px 16px 20px; }
          .hero-badge { font-size: 9px; letter-spacing: 4px; padding: 5px 14px; }
          .hero-title { font-size: 26px; letter-spacing: 2px; }
          .hero-sub { font-size: 12px; }

          .main { padding: 0 12px 48px; }
          .card { padding: 24px 16px; }

          /* 星ボタン：大きめに */
          .star-btn { font-size: 36px; }
          .rating-text { font-size: 14px; }

          /* 選択肢ボタン：タップしやすく */
          .options-grid { gap: 8px; }
          .option-btn {
            padding: 12px 14px;
            font-size: 13px;
            min-height: 44px;
            flex: 1 1 calc(50% - 4px);
          }

          /* テキストエリア */
          .notes-textarea { font-size: 16px; padding: 14px; } /* 16px以上でiOSズーム防止 */

          /* ボタン類：タップしやすく */
          .generate-btn { padding: 20px; font-size: 13px; min-height: 56px; }
          .google-btn { padding: 18px; font-size: 12px; min-height: 54px; }
          .regen-btn { padding: 16px; min-height: 48px; }

          /* アクションボタン */
          .action-btn { padding: 8px 14px; font-size: 11px; min-height: 36px; }

          /* レビュー結果 */
          .review-box { padding: 20px 16px; font-size: 14px; line-height: 1.9; }
          .auto-copy-notice { font-size: 11px; }

          .footer p { font-size: 10px; letter-spacing: 1px; }
        }
      `}</style>

      <div className="page-wrapper">
        <div className="bg-layer" />
        <div className="overlay" />

        <div className="content">
          {/* ヘッダー */}
          <header className="header">
            <div className="header-inner">
              <div className="logo">
                <span className="logo-main">L-STAY</span>
                <span className="logo-sep">|</span>
                <span className="logo-sub">HOTEL · AICHI · JAPAN</span>
              </div>
              <div className="lang-buttons">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLanguage(l.code)}
                    className={`lang-btn ${language === l.code ? "active" : ""}`}
                  >
                    {l.flag} {l.label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {/* ヒーロー */}
          <section className="hero">
            <div className="hero-badge">MINPAKU · REVIEW GENERATOR</div>
            <h1 className="hero-title">
              民泊 <span>L-STAY Hotel</span>
            </h1>
            <p className="hero-sub">{t.subtitle}</p>
            <div className="divider">
              <div className="divider-line" />
              <div className="divider-diamond" />
              <div className="divider-line" />
            </div>
          </section>

          {/* フォーム */}
          <main className="main">
            <div className="card">
              {/* 星評価 */}
              <div className="rating-wrap">
                <span className="field-label">{t.rating}</span>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className={`star-btn ${star <= currentRating ? "on" : "off"}`}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      ★
                    </button>
                  ))}
                  <span className="rating-text">{RATING_LABELS[language][currentRating - 1]}</span>
                </div>
              </div>

              {/* 選択式3問 */}
              {questions.map((q, idx) => (
                <div key={idx} className="question-wrap">
                  <span className="field-label">{q.label}</span>
                  <div className="options-grid">
                    {q.options.map((opt) => (
                      <button
                        key={opt.value}
                        className={`option-btn ${answers[idx] === opt.value ? "selected" : ""}`}
                        onClick={() => setAnswer(idx as 0 | 1 | 2 | 3, answers[idx] === opt.value ? "" : opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* メモ入力（任意） */}
              <div className="notes-wrap">
                <span className="field-label">{t.notes}</span>
                <textarea
                  className="notes-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={PLACEHOLDERS[language]}
                  rows={4}
                />
                <div className="char-count">{notes.length} {t.chars}</div>
              </div>

              {/* エラー */}
              {error && <div className="error-box">{error}</div>}

              {/* 生成ボタン */}
              <button
                className="generate-btn"
                onClick={() => { void generateReview(); }}
                disabled={loading}
              >
                {loading ? t.generating : t.generate}
              </button>

              {/* 結果 */}
              {review && (
                <div className="result-wrap">
                  <div className="result-header">
                    <span className="field-label" style={{ marginBottom: 0 }}>{t.result}</span>
                    <div className="action-buttons">
                      <button
                        className={`action-btn copy ${copied ? "done" : ""}`}
                        onClick={() => { void handleCopy(); }}
                      >
                        {copied ? "✓ Copied" : "Copy"}
                      </button>
                      <button className="action-btn sns" onClick={handleTwitterShare}>𝕏</button>
                      <button className="action-btn sns" onClick={handleLineShare}>LINE</button>
                    </div>
                  </div>

                  <div className="review-box">
                    <div className="review-stars">
                      {Array.from({ length: rating }).map((_, i) => (
                        <span key={i} style={{ color: "#c9a84c", fontSize: 14 }}>★</span>
                      ))}
                      {Array.from({ length: 5 - rating }).map((_, i) => (
                        <span key={`e${i}`} style={{ color: "rgba(255,255,255,0.1)", fontSize: 14 }}>★</span>
                      ))}
                    </div>
                    {review}
                  </div>

                  {autoCopied && (
                    <div className="auto-copy-notice">{t.auto_copied}</div>
                  )}

                  <button
                    className="google-btn"
                    onClick={() => { void handleGoogleReview(); }}
                  >
                    <span className="google-icon">G</span>
                    {t.google_btn}
                  </button>

                  <button
                    className="regen-btn"
                    onClick={() => { void generateReview(); }}
                    disabled={loading}
                  >
                    {t.regenerate}
                  </button>
                </div>
              )}
            </div>
          </main>

          {/* フッター */}
          <footer className="footer">
            <p>© 2025 <span>L-STAY HOTEL</span> · All Rights Reserved · Powered by OpenAI</p>
          </footer>
        </div>
      </div>
    </>
  );
}
