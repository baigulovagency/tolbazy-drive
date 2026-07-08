import { prisma } from "../db";

export type RaceSettings = {
  roundSeconds: number;
  pauseSeconds: number;
  maxRounds: number;
};

export const DEFAULT_RACE_SETTINGS: RaceSettings = {
  roundSeconds: 180,
  pauseSeconds: 90,
  maxRounds: 3
};

export async function acceptOrderAtomically(params: {
  orderId: string;
  driverUserId: string;
  fleetId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: params.orderId } });
    if (!order || order.status !== "broadcasting" || order.driverId) {
      return { accepted: false as const };
    }

    const round = order.currentRound || 1;

    const updated = await tx.order.updateMany({
      where: {
        id: params.orderId,
        status: "broadcasting",
        driverId: null
      },
      data: {
        status: "taken",
        driverId: params.driverUserId,
        fleetId: params.fleetId
      }
    });

    if (updated.count !== 1) {
      return { accepted: false as const };
    }

    await tx.orderOffer.updateMany({
      where: {
        orderId: params.orderId,
        driverId: { not: params.driverUserId },
        status: "sent"
      },
      data: { status: "stale" }
    });

    await tx.orderOffer.upsert({
      where: {
        orderId_driverId_round: {
          orderId: params.orderId,
          driverId: params.driverUserId,
          round
        }
      },
      create: {
        orderId: params.orderId,
        driverId: params.driverUserId,
        round,
        status: "accepted"
      },
      update: {
        status: "accepted"
      }
    });

    await tx.orderEvent.create({
      data: {
        orderId: params.orderId,
        actorId: params.driverUserId,
        type: "order.accepted",
        payload: { fleetId: params.fleetId }
      }
    });

    return { accepted: true as const };
  });
}

export async function skipOrderForRound(params: {
  orderId: string;
  driverUserId: string;
  round: number;
}) {
  await prisma.orderOffer.upsert({
    where: {
      orderId_driverId_round: {
        orderId: params.orderId,
        driverId: params.driverUserId,
        round: params.round
      }
    },
    create: {
      orderId: params.orderId,
      driverId: params.driverUserId,
      round: params.round,
      status: "skipped"
    },
    update: {
      status: "skipped"
    }
  });
}

export async function getEligibleDrivers(params: { fleetId?: string }) {
  return prisma.user.findMany({
    where: {
      role: "driver",
      fleetId: params.fleetId,
      driverProfile: {
        isOnline: true
      },
      driverOrders: {
        none: {
          status: {
            in: ["taken", "arriving", "waiting", "in_trip"]
          }
        }
      },
      fleet: {
        isActive: true
      }
    },
    include: {
      fleet: true,
      driverProfile: true
    }
  });
}
