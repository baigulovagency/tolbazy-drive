import { prisma } from "../db";
import { DEFAULT_BOT_TEXT_MAP, DEFAULT_BOT_TEXTS } from "./bot-text-defaults";

let cache = new Map<string, string>(Object.entries(DEFAULT_BOT_TEXT_MAP));

export function t(key: string, vars?: Record<string, string | number | undefined>) {
  let text = cache.get(key) ?? DEFAULT_BOT_TEXT_MAP[key] ?? key;

  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      if (value !== undefined) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
  }

  return text;
}

export async function reloadBotTexts() {
  const rows = await prisma.botText.findMany();
  cache = new Map(Object.entries(DEFAULT_BOT_TEXT_MAP));

  for (const row of rows) {
    cache.set(row.key, row.body);
  }
}

export async function seedBotTexts() {
  for (const item of DEFAULT_BOT_TEXTS) {
    await prisma.botText.upsert({
      where: { key: item.key },
      create: item,
      update: {
        category: item.category,
        label: item.label
      }
    });
  }

  await reloadBotTexts();
}

export function listBotTextDefaults() {
  return DEFAULT_BOT_TEXTS;
}
