import { Bot } from "grammy";
import { prisma } from "../db";
import { activeRideKeyboard, driverOfferKeyboard, passengerMainMenu } from "./keyboards";
import { acceptOrderAtomically, skipOrderForRound } from "../domain/race";

export function createTelegramBot(token: string) {
  const bot = new Bot(token);

  bot.command("start", async (ctx) => {
    const telegramId = String(ctx.from?.id);
    const user = await prisma.user.upsert({
      where: { telegramId },
      create: {
        telegramId,
        name: ctx.from?.first_name,
        role: "passenger"
      },
      update: {
        name: ctx.from?.first_name
      }
    });

    await ctx.reply(
      `Здравствуйте, ${user.name ?? "друг"}! Это Толбазы Драйв. Здесь можно заказать такси без звонков по разным номерам.`,
      { reply_markup: passengerMainMenu() }
    );
  });

  bot.hears("🚕 Новый заказ", async (ctx) => {
    await ctx.reply(
      "Начнём заказ. В первой версии выберите адрес из справочника или напишите его текстом. Дальше бот определит зону и покажет цену.",
      { reply_markup: passengerMainMenu() }
    );
  });

  bot.hears("❓ Помощь", async (ctx) => {
    await ctx.reply(
      "Как заказать: нажмите «Новый заказ», выберите откуда и куда, подтвердите цену. Если машина не приехала, звоните диспетчеру выбранного автопарка."
    );
  });

  bot.callbackQuery(/^driver:accept:(.+)$/, async (ctx) => {
    const orderId = ctx.match[1];
    const telegramId = String(ctx.from.id);
    const driver = await prisma.user.findUnique({ where: { telegramId }, include: { fleet: true } });

    if (!driver?.fleetId) {
      await ctx.answerCallbackQuery({ text: "Водитель не привязан к автопарку", show_alert: true });
      return;
    }

    const result = await acceptOrderAtomically({
      orderId,
      driverUserId: driver.id,
      fleetId: driver.fleetId
    });

    if (!result.accepted) {
      await ctx.editMessageText("❌ Заказ уже принят другим водителем");
      return;
    }

    await ctx.editMessageText("✅ Вы приняли заказ. Свяжитесь с пассажиром и меняйте статусы по поездке.");
  });

  bot.callbackQuery(/^driver:skip:(.+):(\d+)$/, async (ctx) => {
    const [, orderId, roundValue] = ctx.match;
    const telegramId = String(ctx.from.id);
    const driver = await prisma.user.findUnique({ where: { telegramId } });
    if (!driver) return;

    await skipOrderForRound({
      orderId,
      driverUserId: driver.id,
      round: Number(roundValue)
    });
    await ctx.editMessageText("Вы пропустили заказ. Если его никто не примет, он может прийти снова в следующем раунде.");
  });

  async function sendDriverOffer(params: {
    driverTelegramId: string;
    orderId: string;
    round: number;
    text: string;
  }) {
    return bot.api.sendMessage(params.driverTelegramId, params.text, {
      reply_markup: driverOfferKeyboard(params.orderId, params.round)
    });
  }

  async function notifyPassengerDriverFound(params: {
    passengerTelegramId: string;
    driverName: string;
    fleetName: string;
    dispatcherPhone?: string;
  }) {
    return bot.api.sendMessage(
      params.passengerTelegramId,
      `✅ Машина найдена\nВодитель: ${params.driverName}\nПарк: ${params.fleetName}`,
      { reply_markup: activeRideKeyboard(params.dispatcherPhone) }
    );
  }

  return { bot, sendDriverOffer, notifyPassengerDriverFound };
}
