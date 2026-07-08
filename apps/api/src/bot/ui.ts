import type { Context } from "grammy";
import type { InlineKeyboard } from "grammy";

type HubState = {
  chatId: number;
  messageId: number;
};

const hubs = new Map<string, HubState>();

export function getHub(telegramId: string) {
  return hubs.get(telegramId);
}

export function setHub(telegramId: string, chatId: number, messageId: number) {
  hubs.set(telegramId, { chatId, messageId });
}

export function clearHub(telegramId: string) {
  hubs.delete(telegramId);
}

type ReplyMarkup = InlineKeyboard | undefined;

export async function editHub(
  ctx: Context,
  telegramId: string,
  text: string,
  replyMarkup?: ReplyMarkup
) {
  const hub = getHub(telegramId);

  if (hub) {
    try {
      await ctx.api.editMessageText(hub.chatId, hub.messageId, text, {
        reply_markup: replyMarkup
      });
      return hub;
    } catch {
      hubs.delete(telegramId);
    }
  }

  const message = await ctx.reply(text, { reply_markup: replyMarkup });
  setHub(telegramId, message.chat.id, message.message_id);
  return { chatId: message.chat.id, messageId: message.message_id };
}

export async function showHub(
  ctx: Context,
  telegramId: string,
  text: string,
  replyMarkup?: ReplyMarkup
) {
  const hub = getHub(telegramId);

  if (hub) {
    try {
      await ctx.api.editMessageText(hub.chatId, hub.messageId, text, {
        reply_markup: replyMarkup
      });
      return hub;
    } catch {
      hubs.delete(telegramId);
    }
  }

  const message = await ctx.reply(text, { reply_markup: replyMarkup });
  setHub(telegramId, message.chat.id, message.message_id);
  return { chatId: message.chat.id, messageId: message.message_id };
}

export async function editPassengerOrderMessage(
  api: Context["api"],
  params: {
    chatId?: string | null;
    messageId?: string | null;
    text: string;
    replyMarkup?: InlineKeyboard;
  }
) {
  if (!params.chatId || !params.messageId) {
    return false;
  }

  try {
    await api.editMessageText(Number(params.chatId), Number(params.messageId), params.text, {
      reply_markup: params.replyMarkup
    });
    return true;
  } catch {
    return false;
  }
}
