"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BotTextRow = {
  key: string;
  category: string;
  label: string;
  body: string;
};

const categoryTitles: Record<string, string> = {
  general: "Общие",
  order: "Заказ",
  status: "Статусы",
  alert: "Ошибки и подсказки",
  driver: "Водитель",
  keyboard: "Кнопки"
};

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export default function BotTextsPage() {
  const [texts, setTexts] = useState<BotTextRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiBaseUrl()}/admin/bot-texts`)
      .then((response) => response.json())
      .then((rows: BotTextRow[]) => {
        setTexts(rows);
        setDrafts(Object.fromEntries(rows.map((row) => [row.key, row.body])));
      })
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, BotTextRow[]>();
    for (const row of texts) {
      const list = map.get(row.category) ?? [];
      list.push(row);
      map.set(row.category, list);
    }
    return map;
  }, [texts]);

  async function saveRow(key: string) {
    setStatus(`Сохраняю ${key}...`);
    const response = await fetch(`${apiBaseUrl()}/admin/bot-texts/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: drafts[key] })
    });

    if (!response.ok) {
      setStatus(`Ошибка сохранения: ${key}`);
      return;
    }

    setStatus(`Сохранено: ${key}`);
  }

  if (loading) {
    return (
      <main>
        <p>Загрузка текстов...</p>
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <p className="pill">Редактор текстов бота</p>
        <h1>Тексты Telegram-бота</h1>
        <p>
          Здесь можно менять приветствие, шаги заказа, ошибки и подписи кнопок. Переменные в фигурных
          скобках подставляются автоматически, например {"{name}"}, {"{route}"}, {"{price}"}.
        </p>
        <p>
          <Link href="/">← На главную</Link>
        </p>
      </section>

      {status ? <p className="status-line">{status}</p> : null}

      {[...grouped.entries()].map(([category, rows]) => (
        <section key={category} className="card section-card">
          <h2>{categoryTitles[category] ?? category}</h2>
          {rows.map((row) => (
            <div key={row.key} className="text-editor">
              <div className="text-editor-head">
                <strong>{row.label}</strong>
                <code>{row.key}</code>
              </div>
              <textarea
                rows={4}
                value={drafts[row.key] ?? ""}
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [row.key]: event.target.value }))
                }
              />
              <button type="button" onClick={() => saveRow(row.key)}>
                Сохранить
              </button>
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
