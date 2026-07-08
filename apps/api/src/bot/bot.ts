import { Bot } from "grammy";
import { prisma } from "../db";
import {
  createAndBroadcastOrder,
  formatRouteLabel,
  getActiveFleets,
  getAllZones,
  quoteForAnyFleet,
  quoteForFleet,
  scheduleRaceRounds
} from "../domain/order-service";
import { acceptOrderAtomically, skipOrderForRound } from "../domain/race";
import {
  activeRideKeyboard,
  confirmOrderKeyboard,
  fleetChoiceKeyboard,
  passengerMainMenu,
  zoneGroupKeyboard,
  zonesKeyboard
} from "./keyboards";
import { clearDraft, getDraft, setDraft, startDraft } from "./session";

async function getOrCreatePassenger(telegramId: string, name?: string) {
  return prisma.user.upsert({
    where: { telegramId },
    create: { telegramId, name, role: "passenger" },
    update: { name }
  });
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    broadcasting: "Ищем машину…",
    taken: "Водитель назначен",
    arriving: "Едет к вам",
    waiting: "На месте",
    in_trip: "В пути",
    completed: "Завершено",
    cancelled: "Отменено",
    expired: "Не нашли машину"
  };
  return labels[status] ?? status;
}

export function createTelegramBot(token: string) {
  const bot = new Bot(token);

  bot.catch((error) => {
    console.error("Telegram bot handler error:", error);
  });

  bot.command("start", async (ctx) => {
    const telegramId = String(ctx.from?.id);
    const user = await getOrCreatePassenger(telegramId, ctx.from?.first_name);

    await ctx.reply(
      `Здравствуйте, ${user.name ?? "друг"}! Это Толбазы Драйв.\n\nЗакажите такси без звонков по разным номерам.`,
      { reply_markup: passengerMainMenu() }
    );
  });

  bot.command("cancel", async (ctx) => {
    clearDraft(String(ctx.from?.id));
    await ctx.reply("Заказ отменён.", { reply_markup: passengerMainMenu() });
  });

  bot.command("driver", async (ctx) => {
    const telegramId = String(ctx.from?.id);
    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: { driverProfile: true, fleet: true }
    });

    if (!user || user.role !== "driver" || !user.driverProfile) {
      await ctx.reply("Вы не зарегистрированы как водитель. Обратитесь к диспетчеру автопарка.");
      return;
    }

    const isOnline = !user.driverProfile.isOnline;
    await prisma.driver.update({
      where: { userId: user.id },
      data: { isOnline }
    });

    await ctx.reply(
      isOnline
        ? `✅ Вы на линии (${user.fleet?.name ?? "автопарк"}).\nНовые заказы будут приходить сюда.`
        : "Вы сняты с линии. Заказы приходить не будут."
    );
  });

  bot.hears("🚕 Новый заказ", async (ctx) => {
    const telegramId = String(ctx.from?.id);
    await getOrCreatePassenger(telegramId, ctx.from?.first_name);
    startDraft(telegramId);

    await ctx.reply("📍 Откуда поедем?\n\nВыберите зону:", {
      reply_markup: zoneGroupKeyboard("from")
    });
  });

  bot.hears("📋 Мои поездки", async (ctx) => {
    const telegramId = String(ctx.from?.id);
    const user = await getOrCreatePassenger(telegramId, ctx.from?.first_name);

    const orders = await prisma.order.findMany({
      where: { passengerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { fleet: true }
    });

    if (orders.length === 0) {
      await ctx.reply("Пока нет поездок. Нажмите «Новый заказ».", { reply_markup: passengerMainMenu() });
      return;
    }

    const lines = orders.map((order, index) => {
      const points = order.points as Array<{ label: string }>;
      const route = points.map((point) => point.label).join(" → ");
      const price = order.quotedPriceRub ? `${order.quotedPriceRub} ₽` : "—";
      const date = order.createdAt.toLocaleDateString("ru-RU");
      return `${index + 1}. ${date}\n${route}\n${statusLabel(order.status)} · ${price}`;
    });

    await ctx.reply(`📋 Последние поездки:\n\n${lines.join("\n\n")}`, {
      reply_markup: passengerMainMenu()
    });
  });

  bot.hears(["📍 Мои адреса", "❌ Отменить заказ"], async (ctx) => {
    await ctx.reply("Эта функция скоро появится. Пока заказывайте через «Новый заказ».", {
      reply_markup: passengerMainMenu()
    });
  });

  bot.hears("❓ Помощь", async (ctx) => {
    await ctx.reply(
      "Как заказать:\n1. Нажмите «Новый заказ»\n2. Выберите откуда и куда\n3. Выберите автопарк\n4. Подтвердите цену\n\nОтмена: кнопка «Отмена» или команда /cancel",
      { reply_markup: passengerMainMenu() }
    );
  });

  bot.callbackQuery(/^zonegrp:(from|to):(tolbazy|district|back)$/, async (ctx) => {
    const [, step, group] = ctx.match;
    const telegramId = String(ctx.from.id);
    const draft = getDraft(telegramId);
    if (!draft) {
      await ctx.answerCallbackQuery({ text: "Сессия истекла. Нажмите «Новый заказ».", show_alert: true });
      return;
    }

    if (group === "back") {
      setDraft(telegramId, { ...draft, step: step as "from" | "to" });
      await ctx.editMessageText(
        step === "from" ? "📍 Откуда поедем?\n\nВыберите зону:" : "📍 Куда поедем?\n\nВыберите зону:",
        { reply_markup: zoneGroupKeyboard(step as "from" | "to") }
      );
      await ctx.answerCallbackQuery();
      return;
    }

    const zones = await getAllZones();
    const filtered = zones.filter((zone) => zone.type === group);

    await ctx.editMessageText(
      step === "from" ? "📍 Откуда поедем?" : "📍 Куда поедем?",
      { reply_markup: zonesKeyboard(step as "from" | "to", filtered) }
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^zone:(from|to):(.+)$/, async (ctx) => {
    const [, step, zoneId] = ctx.match;
    const telegramId = String(ctx.from.id);
    const draft = getDraft(telegramId);
    if (!draft) {
      await ctx.answerCallbackQuery({ text: "Сессия истекла", show_alert: true });
      return;
    }

    const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone) {
      await ctx.answerCallbackQuery({ text: "Зона не найдена", show_alert: true });
      return;
    }

    if (step === "from") {
      setDraft(telegramId, {
        ...draft,
        step: "to",
        fromZoneId: zone.id,
        fromLabel: zone.name
      });
      await ctx.editMessageText("📍 Куда поедем?\n\nВыберите зону:", {
        reply_markup: zoneGroupKeyboard("to")
      });
      await ctx.answerCallbackQuery();
      return;
    }

    setDraft(telegramId, {
      ...draft,
      step: "fleet",
      toZoneId: zone.id,
      toLabel: zone.name
    });

    const fleets = await getActiveFleets();
    await ctx.editMessageText("🚕 Выберите автопарк:", {
      reply_markup: fleetChoiceKeyboard(fleets)
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^fleet:(any|.+)$/, async (ctx) => {
    const fleetKey = ctx.match[1];
    const telegramId = String(ctx.from.id);
    const draft = getDraft(telegramId);

    if (!draft?.fromZoneId || !draft.toZoneId || !draft.fromLabel || !draft.toLabel) {
      await ctx.answerCallbackQuery({ text: "Сначала выберите маршрут", show_alert: true });
      return;
    }

    let priceLabel = "";
    let quotedPriceRub: number | undefined;
    let fleetId: string | undefined;
    let fleetChoice: "any" | "specific" = "any";

    if (fleetKey === "any") {
      const { range, quotes } = await quoteForAnyFleet({
        fromZoneId: draft.fromZoneId,
        toZoneId: draft.toZoneId,
        fromLabel: draft.fromLabel,
        toLabel: draft.toLabel
      });

      if (!range) {
        await ctx.answerCallbackQuery({ text: "Не удалось рассчитать цену", show_alert: true });
        return;
      }

      priceLabel =
        range.minRub === range.maxRub
          ? `${range.minRub} ₽`
          : `от ${range.minRub} до ${range.maxRub} ₽`;
      quotedPriceRub = range.minRub;
      fleetChoice = "any";

      const details = quotes
        .filter((quote) => quote.priceRub)
        .map((quote) => `${quote.fleetName}: ${quote.priceRub} ₽`)
        .join("\n");

      setDraft(telegramId, {
        ...draft,
        step: "confirm",
        fleetChoice,
        priceLabel,
        quotedPriceRub
      });

      await ctx.editMessageText(
        [
          "📋 Ваш заказ",
          "",
          `Откуда: ${draft.fromLabel}`,
          `Куда: ${draft.toLabel}`,
          `Парк: Любой свободный`,
          `💰 ${priceLabel}`,
          details ? `\n${details}` : ""
        ].join("\n"),
        { reply_markup: confirmOrderKeyboard() }
      );
      await ctx.answerCallbackQuery();
      return;
    }

    const fleet = await prisma.fleet.findUnique({ where: { id: fleetKey } });
    if (!fleet) {
      await ctx.answerCallbackQuery({ text: "Автопарк не найден", show_alert: true });
      return;
    }

    const quote = await quoteForFleet({
      fleetId: fleet.id,
      fromZoneId: draft.fromZoneId,
      toZoneId: draft.toZoneId,
      fromLabel: draft.fromLabel,
      toLabel: draft.toLabel
    });

    if (quote.kind !== "fixed") {
      await ctx.answerCallbackQuery({ text: "Цену уточнит диспетчер", show_alert: true });
      return;
    }

    fleetId = fleet.id;
    fleetChoice = "specific";
    priceLabel = `${quote.priceRub} ₽`;
    quotedPriceRub = quote.priceRub;

    setDraft(telegramId, {
      ...draft,
      step: "confirm",
      fleetId,
      fleetChoice,
      priceLabel,
      quotedPriceRub
    });

    await ctx.editMessageText(
      [
        "📋 Ваш заказ",
        "",
        `Откуда: ${draft.fromLabel}`,
        `Куда: ${draft.toLabel}`,
        `Парк: ${fleet.name}`,
        `💰 ${priceLabel}`
      ].join("\n"),
      { reply_markup: confirmOrderKeyboard() }
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("order:confirm", async (ctx) => {
    const telegramId = String(ctx.from.id);
    const draft = getDraft(telegramId);
    const user = await getOrCreatePassenger(telegramId, ctx.from?.first_name);

    if (!draft?.fromZoneId || !draft.toZoneId || !draft.fromLabel || !draft.toLabel || !draft.priceLabel) {
      await ctx.answerCallbackQuery({ text: "Данные заказа неполные", show_alert: true });
      return;
    }

    const activeOrder = await prisma.order.findFirst({
      where: {
        passengerId: user.id,
        status: { in: ["broadcasting", "taken", "arriving", "waiting", "in_trip"] }
      }
    });

    if (activeOrder) {
      await ctx.answerCallbackQuery({ text: "У вас уже есть активный заказ", show_alert: true });
      return;
    }

    const { order, sentCount } = await createAndBroadcastOrder({
      bot,
      passengerId: user.id,
      fromZoneId: draft.fromZoneId,
      toZoneId: draft.toZoneId,
      fromLabel: draft.fromLabel,
      toLabel: draft.toLabel,
      fleetId: draft.fleetId,
      fleetChoice: draft.fleetChoice ?? "any",
      quotedPriceRub: draft.quotedPriceRub,
      priceLabel: draft.priceLabel
    });

    clearDraft(telegramId);

    scheduleRaceRounds({
      bot,
      orderId: order.id,
      fleetId: draft.fleetChoice === "specific" ? draft.fleetId : undefined,
      fromLabel: draft.fromLabel,
      toLabel: draft.toLabel,
      priceLabel: draft.priceLabel
    });

    const route = formatRouteLabel(
      { id: draft.fromZoneId, name: draft.fromLabel, type: "" },
      { id: draft.toZoneId, name: draft.toLabel, type: "" }
    );

    await ctx.editMessageText(
      sentCount > 0
        ? `✅ Заказ принят!\n\n${route}\n💰 ${draft.priceLabel}\n\nИщем машину… (уведомлено водителей: ${sentCount})`
        : `✅ Заказ принят, но сейчас нет водителей на линии.\n\n${route}\n💰 ${draft.priceLabel}\n\nПовторим поиск автоматически.`
    );

    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(["order:cancel", "order:restart", "order:back:to"], async (ctx) => {
    const telegramId = String(ctx.from.id);
    const data = ctx.callbackQuery.data;

    if (data === "order:cancel") {
      clearDraft(telegramId);
      await ctx.editMessageText("Заказ отменён.");
      await ctx.reply("Главное меню:", { reply_markup: passengerMainMenu() });
      await ctx.answerCallbackQuery();
      return;
    }

    if (data === "order:restart") {
      startDraft(telegramId);
      await ctx.editMessageText("📍 Откуда поедем?\n\nВыберите зону:", {
        reply_markup: zoneGroupKeyboard("from")
      });
      await ctx.answerCallbackQuery();
      return;
    }

    const draft = getDraft(telegramId);
    if (draft) {
      setDraft(telegramId, { ...draft, step: "to" });
    }
    await ctx.editMessageText("📍 Куда поедем?\n\nВыберите зону:", {
      reply_markup: zoneGroupKeyboard("to")
    });
    await ctx.answerCallbackQuery();
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
      await ctx.answerCallbackQuery();
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { passenger: true, fleet: true }
    });

    if (order?.passenger.telegramId) {
      await bot.api.sendMessage(
        order.passenger.telegramId,
        `✅ Машина найдена!\nВодитель: ${driver.name ?? "водитель"}\nПарк: ${order.fleet?.name ?? "—"}\n💰 ${order.quotedPriceRub ?? "—"} ₽`,
        { reply_markup: activeRideKeyboard(order.fleet?.dispatcherPhone ?? undefined) }
      );
    }

    await ctx.editMessageText("✅ Вы приняли заказ. Свяжитесь с пассажиром.");
    await ctx.answerCallbackQuery();
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
    await ctx.editMessageText("Вы пропустили заказ.");
    await ctx.answerCallbackQuery();
  });

  return { bot };
}
