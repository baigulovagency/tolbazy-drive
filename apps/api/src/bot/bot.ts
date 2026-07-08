import { Bot, type Context } from "grammy";
import { prisma } from "../db";
import { t } from "../domain/bot-texts";
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
import { editHub, editPassengerOrderMessage, getHub, setHub, showHub } from "./ui";

async function getOrCreatePassenger(telegramId: string, name?: string) {
  return prisma.user.upsert({
    where: { telegramId },
    create: { telegramId, name, role: "passenger" },
    update: { name }
  });
}

function statusLabel(status: string) {
  const key = `status.${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
}

function buildOrderSummary(params: {
  fromLabel: string;
  toLabel: string;
  fleetLabel: string;
  priceLabel: string;
  details?: string;
}) {
  return [
    t("order.summary_header"),
    "",
    `${t("label.from")}: ${params.fromLabel}`,
    `${t("label.to")}: ${params.toLabel}`,
    `${t("label.fleet")}: ${params.fleetLabel}`,
    `${t("label.price")} ${params.priceLabel}`,
    params.details ? `\n${params.details}` : ""
  ].join("\n");
}

async function showWelcome(ctx: Context, telegramId: string, name?: string | null) {
  const text = t("bot.welcome", { name: name ?? "друг" });
  const hub = getHub(telegramId);

  if (hub) {
    await showHub(ctx, telegramId, text);
    return;
  }

  const message = await ctx.reply(text, { reply_markup: passengerMainMenu() });
  setHub(telegramId, message.chat.id, message.message_id);
}

export function createTelegramBot(token: string) {
  const bot = new Bot(token);

  bot.catch((error) => {
    console.error("Telegram bot handler error:", error);
  });

  bot.command("start", async (ctx) => {
    const telegramId = String(ctx.from?.id);
    const user = await getOrCreatePassenger(telegramId, ctx.from?.first_name);
    clearDraft(telegramId);
    await showWelcome(ctx, telegramId, user.name);
  });

  bot.command("cancel", async (ctx) => {
    const telegramId = String(ctx.from?.id);
    clearDraft(telegramId);
    await showHub(ctx, telegramId, t("bot.cancelled"));
  });

  bot.command("driver", async (ctx) => {
    const telegramId = String(ctx.from?.id);
    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: { driverProfile: true, fleet: true }
    });

    if (!user || user.role !== "driver" || !user.driverProfile) {
      await ctx.reply(t("driver.not_registered"));
      return;
    }

    const isOnline = !user.driverProfile.isOnline;
    await prisma.driver.update({
      where: { userId: user.id },
      data: { isOnline }
    });

    await ctx.reply(
      isOnline
        ? t("driver.online", { fleet: user.fleet?.name ?? "автопарк" })
        : t("driver.offline")
    );
  });

  bot.on("message:text", async (ctx, next) => {
    const text = ctx.message.text?.trim();
    if (!text) {
      await next();
      return;
    }

    const telegramId = String(ctx.from?.id);

    if (text === t("kbd.new_order")) {
      await getOrCreatePassenger(telegramId, ctx.from?.first_name);
      startDraft(telegramId);
      await editHub(ctx, telegramId, t("order.from_prompt"), zoneGroupKeyboard("from"));
      return;
    }

    if (text === t("kbd.my_trips")) {
      const user = await getOrCreatePassenger(telegramId, ctx.from?.first_name);
      const orders = await prisma.order.findMany({
        where: { passengerId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { fleet: true }
      });

      if (orders.length === 0) {
        await showHub(ctx, telegramId, t("bot.trips_empty"));
        return;
      }

      const lines = orders.map((order, index) => {
        const points = order.points as Array<{ label: string }>;
        const route = points.map((point) => point.label).join(" → ");
        const price = order.quotedPriceRub ? `${order.quotedPriceRub} ₽` : "—";
        const date = order.createdAt.toLocaleDateString("ru-RU");
        return `${index + 1}. ${date}\n${route}\n${statusLabel(order.status)} · ${price}`;
      });

      await showHub(ctx, telegramId, `${t("bot.trips_header")}\n\n${lines.join("\n\n")}`);
      return;
    }

    if (text === t("kbd.my_addresses") || text === t("kbd.cancel_order")) {
      await showHub(ctx, telegramId, t("bot.coming_soon"));
      return;
    }

    if (text === t("kbd.help")) {
      await showHub(ctx, telegramId, t("bot.help"));
      return;
    }

    await next();
  });

  bot.callbackQuery(/^zonegrp:(from|to):(tolbazy|district|back)$/, async (ctx) => {
    const [, step, group] = ctx.match;
    const telegramId = String(ctx.from.id);
    const draft = getDraft(telegramId);
    if (!draft) {
      await ctx.answerCallbackQuery({ text: t("alert.session_expired"), show_alert: true });
      return;
    }

    if (group === "back") {
      setDraft(telegramId, { ...draft, step: step as "from" | "to" });
      await ctx.editMessageText(
        step === "from" ? t("order.from_prompt") : t("order.to_prompt"),
        { reply_markup: zoneGroupKeyboard(step as "from" | "to") }
      );
      await ctx.answerCallbackQuery();
      return;
    }

    const zones = await getAllZones();
    const filtered = zones.filter((zone) => zone.type === group);

    await ctx.editMessageText(
      step === "from" ? t("order.from_title") : t("order.to_title"),
      { reply_markup: zonesKeyboard(step as "from" | "to", filtered) }
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^zone:(from|to):(.+)$/, async (ctx) => {
    const [, step, zoneId] = ctx.match;
    const telegramId = String(ctx.from.id);
    const draft = getDraft(telegramId);
    if (!draft) {
      await ctx.answerCallbackQuery({ text: t("alert.session_expired"), show_alert: true });
      return;
    }

    const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone) {
      await ctx.answerCallbackQuery({ text: t("alert.zone_not_found"), show_alert: true });
      return;
    }

    if (step === "from") {
      setDraft(telegramId, {
        ...draft,
        step: "to",
        fromZoneId: zone.id,
        fromLabel: zone.name
      });
      await ctx.editMessageText(t("order.to_prompt"), {
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
    await ctx.editMessageText(t("order.fleet_prompt"), {
      reply_markup: fleetChoiceKeyboard(fleets)
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^fleet:(any|.+)$/, async (ctx) => {
    const fleetKey = ctx.match[1];
    const telegramId = String(ctx.from.id);
    const draft = getDraft(telegramId);

    if (!draft?.fromZoneId || !draft.toZoneId || !draft.fromLabel || !draft.toLabel) {
      await ctx.answerCallbackQuery({ text: t("alert.route_required"), show_alert: true });
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
        await ctx.answerCallbackQuery({ text: t("alert.price_failed"), show_alert: true });
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
        buildOrderSummary({
          fromLabel: draft.fromLabel,
          toLabel: draft.toLabel,
          fleetLabel: t("order.fleet_any"),
          priceLabel,
          details
        }),
        { reply_markup: confirmOrderKeyboard() }
      );
      await ctx.answerCallbackQuery();
      return;
    }

    const fleet = await prisma.fleet.findUnique({ where: { id: fleetKey } });
    if (!fleet) {
      await ctx.answerCallbackQuery({ text: t("alert.fleet_not_found"), show_alert: true });
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
      await ctx.answerCallbackQuery({ text: t("alert.dispatcher_price"), show_alert: true });
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
      buildOrderSummary({
        fromLabel: draft.fromLabel,
        toLabel: draft.toLabel,
        fleetLabel: fleet.name,
        priceLabel
      }),
      { reply_markup: confirmOrderKeyboard() }
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("order:confirm", async (ctx) => {
    const telegramId = String(ctx.from.id);
    const draft = getDraft(telegramId);
    const user = await getOrCreatePassenger(telegramId, ctx.from?.first_name);

    if (!draft?.fromZoneId || !draft.toZoneId || !draft.fromLabel || !draft.toLabel || !draft.priceLabel) {
      await ctx.answerCallbackQuery({ text: t("alert.order_incomplete"), show_alert: true });
      return;
    }

    const activeOrder = await prisma.order.findFirst({
      where: {
        passengerId: user.id,
        status: { in: ["broadcasting", "taken", "arriving", "waiting", "in_trip"] }
      }
    });

    if (activeOrder) {
      await ctx.answerCallbackQuery({ text: t("alert.active_order"), show_alert: true });
      return;
    }

    const hubMessage = ctx.callbackQuery.message;
    const passengerChatId = hubMessage ? String(hubMessage.chat.id) : undefined;
    const passengerMessageId = hubMessage ? String(hubMessage.message_id) : undefined;

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
      priceLabel: draft.priceLabel,
      passengerChatId,
      passengerMessageId
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
        ? t("order.accepted", { route, price: draft.priceLabel, sentCount })
        : t("order.accepted_no_drivers", { route, price: draft.priceLabel })
    );

    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(["order:cancel", "order:restart", "order:back:to"], async (ctx) => {
    const telegramId = String(ctx.from.id);
    const data = ctx.callbackQuery.data;

    if (data === "order:cancel") {
      clearDraft(telegramId);
      await ctx.editMessageText(t("order.cancelled"));
      await ctx.answerCallbackQuery();
      return;
    }

    if (data === "order:restart") {
      startDraft(telegramId);
      await ctx.editMessageText(t("order.from_prompt"), {
        reply_markup: zoneGroupKeyboard("from")
      });
      await ctx.answerCallbackQuery();
      return;
    }

    const draft = getDraft(telegramId);
    if (draft) {
      setDraft(telegramId, { ...draft, step: "to" });
    }
    await ctx.editMessageText(t("order.to_prompt"), {
      reply_markup: zoneGroupKeyboard("to")
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^driver:accept:(.+)$/, async (ctx) => {
    const orderId = ctx.match[1];
    const telegramId = String(ctx.from.id);
    const driver = await prisma.user.findUnique({ where: { telegramId }, include: { fleet: true } });

    if (!driver?.fleetId) {
      await ctx.answerCallbackQuery({ text: t("driver.not_linked"), show_alert: true });
      return;
    }

    const result = await acceptOrderAtomically({
      orderId,
      driverUserId: driver.id,
      fleetId: driver.fleetId
    });

    if (!result.accepted) {
      await ctx.editMessageText(t("driver.offer_taken"));
      await ctx.answerCallbackQuery();
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { passenger: true, fleet: true }
    });

    if (order) {
      const foundText = t("order.driver_found", {
        driverName: driver.name ?? "водитель",
        fleetName: order.fleet?.name ?? "—",
        price: order.quotedPriceRub ?? "—"
      });

      const edited = await editPassengerOrderMessage(bot.api, {
        chatId: order.passengerChatId,
        messageId: order.passengerMessageId,
        text: foundText,
        replyMarkup: activeRideKeyboard(order.fleet?.dispatcherPhone ?? undefined)
      });

      if (!edited && order.passenger.telegramId) {
        await bot.api.sendMessage(order.passenger.telegramId, foundText, {
          reply_markup: activeRideKeyboard(order.fleet?.dispatcherPhone ?? undefined)
        });
      }
    }

    await ctx.editMessageText(t("driver.accepted"));
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
    await ctx.editMessageText(t("driver.skipped"));
    await ctx.answerCallbackQuery();
  });

  return { bot };
}
