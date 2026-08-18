"use client";

import { useState, useEffect, useCallback } from "react";

interface GiftCode {
  id: number;
  url: string;
  used: number;
  recipient_name: string | null;
  recipient_gmail: string | null;
  distributed_at: string | null;
  created_at: string;
}

interface CodesData {
  total: number;
  used: number;
  remaining: number;
  codes: GiftCode[];
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [data, setData] = useState<CodesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "distributed" | "unused">("all");

  const fetchCodes = useCallback(async (pw: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/codes", {
        headers: { "x-admin-password": pw },
      });
      if (res.status === 401) {
        setAuthError("パスワードが違います");
        setAuthed(false);
        return;
      }
      const json = await res.json() as CodesData;
      setData(json);
      setAuthed(true);
      setAuthError("");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchCodes(password);
  };

  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(() => { void fetchCodes(password); }, 30000);
    return () => clearInterval(interval);
  }, [authed, password, fetchCodes]);

  const handleImport = async () => {
    if (!importText.trim()) return;
    const res = await fetch("/api/admin/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ urls: importText }),
    });
    const json = await res.json() as { imported?: number; error?: string };
    if (json.imported !== undefined) {
      setImportResult(`✅ ${json.imported}件追加しました`);
      setImportText("");
      await fetchCodes(password);
    } else {
      setImportResult(`❌ ${json.error ?? "エラー"}`);
    }
  };

  const toggleUsed = async (id: number, currentUsed: number) => {
    const newUsed = currentUsed === 1 ? 0 : 1;
    let gmail: string | undefined;
    if (newUsed === 1) {
      const input = window.prompt("配布先Gmailアドレスを入力（任意）:");
      gmail = input?.trim() || undefined;
    }
    const res = await fetch("/api/admin/codes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ id, used: newUsed, recipient_gmail: gmail }),
    });
    if (res.ok) {
      await fetchCodes(password);
    } else {
      const j = await res.json() as { error?: string };
      alert(j.error ?? "エラー");
    }
  };

  const filteredCodes = data?.codes.filter(c => {
    if (activeTab === "distributed") return c.used === 1;
    if (activeTab === "unused") return c.used === 0;
    return true;
  }) ?? [];

  const exportCsv = () => {
    const distributed = data?.codes.filter(c => c.used === 1) ?? [];
    const header = "ID,お名前,Gmail,URL,配布日時";
    const rows = distributed.map(c =>
      `${c.id},"${c.recipient_name ?? ""}","${c.recipient_gmail ?? ""}","${c.url}","${c.distributed_at ?? ""}"`
    );
    const blob = new Blob(["﻿" + header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lstay_gift_distributed_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <div style={{ background: "#1a1a1a", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 4, padding: 40, width: 320 }}>
          <h1 style={{ color: "#c9a84c", fontSize: 18, letterSpacing: 4, marginBottom: 24, textAlign: "center" }}>ADMIN</h1>
          <form onSubmit={(e) => { void handleLogin(e); }}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="パスワード"
              style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 2, color: "#f0ebe2", fontSize: 14, marginBottom: 12, boxSizing: "border-box" }}
            />
            {authError && <p style={{ color: "#fca5a5", fontSize: 12, marginBottom: 10 }}>{authError}</p>}
            <button
              type="submit"
              style={{ width: "100%", padding: 12, background: "linear-gradient(135deg,#c9a84c,#e8c96a)", color: "#1a1100", border: "none", borderRadius: 2, fontWeight: 600, cursor: "pointer", letterSpacing: 2 }}
            >
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", color: "#f0ebe2", fontFamily: "sans-serif", padding: "24px 16px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottom: "1px solid rgba(201,168,76,0.2)", paddingBottom: 16 }}>
          <h1 style={{ color: "#c9a84c", fontSize: 20, letterSpacing: 4 }}>L-STAY HOTEL · GIFT ADMIN</h1>
          <button onClick={() => setAuthed(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)", padding: "6px 14px", borderRadius: 2, cursor: "pointer", fontSize: 12 }}>ログアウト</button>
        </div>

        {loading && !data && <p style={{ color: "rgba(255,255,255,0.4)" }}>読み込み中...</p>}

        {data && (
          <>
            {/* サマリー */}
            <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
              {[
                { label: "総コード数", value: data.total, color: "#c9a84c" },
                { label: "配布済み", value: data.used, color: "#4ade80" },
                { label: "残り", value: data.remaining, color: data.remaining <= 3 ? "#f87171" : "#60a5fa" },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "16px 24px", minWidth: 120 }}>
                  <p style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>{s.label}</p>
                  <p style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.value}</p>
                </div>
              ))}
              {data.remaining <= 3 && (
                <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 4, padding: "16px 20px", color: "#fca5a5", fontSize: 13, display: "flex", alignItems: "center" }}>
                  ⚠️ コードが残り少なくなっています！追加してください。
                </div>
              )}
            </div>

            {/* インポート */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 4, padding: 20, marginBottom: 28 }}>
              <h2 style={{ fontSize: 12, letterSpacing: 3, color: "#c9a84c", marginBottom: 12 }}>コードを追加</h2>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder={"URLを1行ずつ貼り付け\nhttps://gift.starbucks.co.jp/c/..."}
                rows={4}
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 2, color: "#f0ebe2", fontSize: 13, padding: 12, boxSizing: "border-box", resize: "vertical", fontFamily: "monospace" }}
              />
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
                <button onClick={() => { void handleImport(); }} style={{ background: "linear-gradient(135deg,#c9a84c,#e8c96a)", color: "#1a1100", border: "none", borderRadius: 2, padding: "8px 20px", fontWeight: 600, cursor: "pointer", fontSize: 12, letterSpacing: 2 }}>追加</button>
                {importResult && <span style={{ fontSize: 13, color: importResult.startsWith("✅") ? "#4ade80" : "#f87171" }}>{importResult}</span>}
              </div>
            </div>

            {/* タブ */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {(["all", "distributed", "unused"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{ padding: "6px 16px", borderRadius: 2, cursor: "pointer", fontSize: 11, letterSpacing: 2, fontFamily: "sans-serif", transition: "all 0.2s",
                    background: activeTab === tab ? "rgba(201,168,76,0.15)" : "transparent",
                    border: activeTab === tab ? "1px solid #c9a84c" : "1px solid rgba(255,255,255,0.1)",
                    color: activeTab === tab ? "#c9a84c" : "rgba(255,255,255,0.4)" }}>
                  {tab === "all" ? "すべて" : tab === "distributed" ? "配布済み" : "未配布"}
                </button>
              ))}
              <button onClick={() => { void fetchCodes(password); }} style={{ marginLeft: "auto", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)", padding: "6px 14px", borderRadius: 2, cursor: "pointer", fontSize: 11 }}>
                更新
              </button>
              <button onClick={exportCsv} style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.4)", color: "#c9a84c", padding: "6px 14px", borderRadius: 2, cursor: "pointer", fontSize: 11, letterSpacing: 1 }}>
                📥 配布記録CSV
              </button>
            </div>

            {/* テーブル */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
                    {["ID", "ステータス", "URL", "お名前", "配布先Gmail", "配布日時", "操作"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "rgba(201,168,76,0.7)", letterSpacing: 2, fontWeight: 400, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCodes.map(c => (
                    <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.3)" }}>{c.id}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 2, fontSize: 10, letterSpacing: 1, background: c.used ? "rgba(74,222,128,0.1)" : "rgba(96,165,250,0.1)", color: c.used ? "#4ade80" : "#60a5fa", border: `1px solid ${c.used ? "rgba(74,222,128,0.3)" : "rgba(96,165,250,0.3)"}` }}>
                          {c.used ? "配布済" : "未配布"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <a href={c.url} target="_blank" rel="noopener" style={{ color: "#c9a84c", textDecoration: "none", fontFamily: "monospace" }}>
                          {c.url.slice(0, 50)}...
                        </a>
                      </td>
                      <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.6)" }}>{c.recipient_name ?? "—"}</td>
                      <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>{c.recipient_gmail ?? "—"}</td>
                      <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>{c.distributed_at ? c.distributed_at.replace("T", " ").slice(0, 16) : "—"}</td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        {c.used ? (
                          <button
                            onClick={() => { void toggleUsed(c.id, c.used); }}
                            style={{ padding: "4px 10px", fontSize: 10, letterSpacing: 1, cursor: "pointer", borderRadius: 2, fontFamily: "sans-serif", background: "transparent", border: "1px solid rgba(248,113,113,0.4)", color: "#f87171" }}
                          >
                            未配布に戻す
                          </button>
                        ) : (
                          <button
                            onClick={() => { void toggleUsed(c.id, c.used); }}
                            style={{ padding: "4px 10px", fontSize: 10, letterSpacing: 1, cursor: "pointer", borderRadius: 2, fontFamily: "sans-serif", background: "transparent", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80" }}
                          >
                            配布済にする
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredCodes.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.2)" }}>データがありません</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
