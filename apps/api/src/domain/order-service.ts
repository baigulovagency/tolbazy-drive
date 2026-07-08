import type { Bot } from "grammy";
import type { TariffCell } from "../../../../packages/shared/src/index.js";
import { prisma } from "../db";
import { t } from "./bot-texts";
import { quoteAnyFleetRange, quoteRoutePrice } from "./pricing";
import { DEFAULT_RACE_SETTINGS, getEligibleDrivers } from "./race";

type ZoneRow = { id: string; name: string; type: string };

export async function getActiveFleets() {
  return prisma.fleet.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });
}

export async function getAllZones() {
  return prisma.zone.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }]
  });
}

async function loadTariffMatrix(fleetId: string): Promise<TariffCell[]> {
  const cells = await prisma.tariffCell.findMany({ where: { fleetId } });
  return cells.map((cell) => ({
    fromZoneId: cell.fromZoneId,
    toZoneId: cell.toZoneId,
    priceRub: cell.priceRub
  }));
}

export async function quoteForFleet(params: {
  fleetId: string;
  fromZoneId: string;
  toZoneId: string;
  fromLabel: string;
  toLabel: string;
}) {
  const matrix = await loadTariffMatrix(params.fleetId);
  return quoteRoutePrice({
    points: [
      { label: params.fromLabel, zoneId: params.fromZoneId },
      { label: params.toLabel, zoneId: params.toZoneId }
    ],
    isRoundTrip: false,
    tariffMatrix: matrix
  });
}

export async function quoteForAnyFleet(params: {
  fromZoneId: string;
  toZoneId: string;
  fromLabel: string;
  toLabel: string;
}) {
  const fleets = await getActiveFleets();
  const quotes = await Promise.all(
    fleets.map(async (fleet) => {
      const quote = await quoteForFleet({ fleetId: fleet.id, ...params });
      return {
        fleetId: fleet.id,
        fleetName: fleet.name,
        priceRub: quote.kind === "fixed" ? quote.priceRub : undefined
      };
    })
  );

  const range = quoteAnyFleetRange(quotes);
  return { quotes, range };
}

export function formatRouteLabel(from: ZoneRow, to: ZoneRow) {
  return `${from.name} → ${to.name}`;
}

export async function createAndBroadcastOrder(params: {
  bot: Bot;
  passengerId: string;
  fromZoneId: string;
  toZoneId: string;
  fromLabel: string;
  toLabel: string;
  fleetId?: string;
  fleetChoice: "any" | "specific";
  quotedPriceRub?: number;
  priceLabel: string;
  passengerChatId?: string;
  passengerMessageId?: string;
}) {
  const order = await prisma.order.create({
    data: {
      passengerId: params.passengerId,
      fleetId: params.fleetChoice === "specific" ? params.fleetId : null,
      status: "broadcasting",
      points: [
        { label: params.fromLabel, zoneId: params.fromZoneId },
        { label: params.toLabel, zoneId: params.toZoneId }
      ],
      isRoundTrip: false,
      quotedPriceRub: params.quotedPriceRub,
      currentRound: 1,
      passengerChatId: params.passengerChatId,
      passengerMessageId: params.passengerMessageId
    },
    include: { passenger: true }
  });

  await prisma.orderEvent.create({
    data: {
      orderId: order.id,
      actorId: params.passengerId,
      type: "order.created",
      payload: { fleetChoice: params.fleetChoice, priceLabel: params.priceLabel }
    }
  });

  const sentCount = await broadcastOrderRound({
    bot: params.bot,
    orderId: order.id,
    round: 1,
    fleetId: params.fleetChoice === "specific" ? params.fleetId : undefined,
    fromLabel: params.fromLabel,
    toLabel: params.toLabel,
    priceLabel: params.priceLabel
  });

  return { order, sentCount };
}

export async function broadcastOrderRound(params: {
  bot: Bot;
  orderId: string;
  round: number;
  fleetId?: string;
  fromLabel: string;
  toLabel: string;
  priceLabel: string;
}) {
  const drivers = await getEligibleDrivers({ fleetId: params.fleetId });
  let sentCount = 0;

  const text = [
    t("driver.offer_header"),
    "───────────────",
    `${t("label.from")}: ${params.fromLabel}`,
    `${t("label.to")}: ${params.toLabel}`,
    `${t("label.price")} ${params.priceLabel}`,
    t("label.round", { round: params.round, maxRounds: DEFAULT_RACE_SETTINGS.maxRounds })
  ].join("\n");

  for (const driver of drivers) {
    if (!driver.telegramId) continue;

    try {
      const message = await params.bot.api.sendMessage(driver.telegramId, text, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Принять", callback_data: `driver:accept:${params.orderId}` },
              { text: "❌ Пропустить", callback_data: `driver:skip:${params.orderId}:${params.round}` }
            ]
          ]
        }
      });

      await prisma.orderOffer.upsert({
        where: {
          orderId_driverId_round: {
            orderId: params.orderId,
            driverId: driver.id,
            round: params.round
          }
        },
        create: {
          orderId: params.orderId,
          driverId: driver.id,
          round: params.round,
          status: "sent",
          messageId: String(message.message_id)
        },
        update: {
          status: "sent",
          messageId: String(message.message_id)
        }
      });

      sentCount += 1;
    } catch (error) {
      console.error(`Failed to notify driver ${driver.id}:`, error);
    }
  }

  return sentCount;
}

export async function scheduleRaceRounds(params: {
  bot: Bot;
  orderId: string;
  fleetId?: string;
  fromLabel: string;
  toLabel: string;
  priceLabel: string;
}) {
  const { roundSeconds, pauseSeconds, maxRounds } = DEFAULT_RACE_SETTINGS;

  for (let round = 2; round <= maxRounds; round += 1) {
    setTimeout(async () => {
      const current = await prisma.order.findUnique({ where: { id: params.orderId } });
      if (!current || current.status !== "broadcasting") return;

      await prisma.order.update({
        where: { id: params.orderId },
        data: { currentRound: round }
      });

      await broadcastOrderRound({
        bot: params.bot,
        orderId: params.orderId,
        round,
        fleetId: params.fleetId,
        fromLabel: params.fromLabel,
        toLabel: params.toLabel,
        priceLabel: params.priceLabel
      });
    }, (round - 1) * (roundSeconds + pauseSeconds) * 1000);
  }

  setTimeout(async () => {
    const current = await prisma.order.findUnique({
      where: { id: params.orderId },
      include: { passenger: true }
    });
    if (!current || current.status !== "broadcasting" || !current.passenger.telegramId) return;

    await prisma.order.update({
      where: { id: params.orderId },
      data: { status: "expired" }
    });

    const expiredText = t("order.expired");
    const edited = current.passengerMessageId && current.passengerChatId
      ? await params.bot.api
          .editMessageText(
            Number(current.passengerChatId),
            Number(current.passengerMessageId),
            expiredText
          )
          .then(() => true)
          .catch(() => false)
      : false;

    if (!edited && current.passenger.telegramId) {
      await params.bot.api.sendMessage(current.passenger.telegramId, expiredText);
    }
  }, maxRounds * (roundSeconds + pauseSeconds) * 1000);
}
