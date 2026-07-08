import type { FastifyInstance } from "fastify";
import { prisma } from "../db";
import { acceptOrderAtomically, skipOrderForRound } from "../domain/race";

export async function registerOrderRoutes(app: FastifyInstance) {
  app.get("/orders/active", async () => {
    return prisma.order.findMany({
      where: {
        status: { in: ["awaiting_price", "broadcasting", "taken", "arriving", "waiting", "in_trip"] }
      },
      include: { fleet: true, passenger: true, driver: true },
      orderBy: { createdAt: "desc" }
    });
  });

  app.post<{
    Params: { orderId: string };
    Body: { driverUserId: string; fleetId: string };
  }>("/orders/:orderId/accept", async (request, reply) => {
    const result = await acceptOrderAtomically({
      orderId: request.params.orderId,
      driverUserId: request.body.driverUserId,
      fleetId: request.body.fleetId
    });

    if (!result.accepted) {
      return reply.code(409).send({ ok: false, reason: "ORDER_ALREADY_TAKEN" });
    }

    return { ok: true };
  });

  app.post<{
    Params: { orderId: string };
    Body: { driverUserId: string; round: number };
  }>("/orders/:orderId/skip", async (request) => {
    await skipOrderForRound({
      orderId: request.params.orderId,
      driverUserId: request.body.driverUserId,
      round: request.body.round
    });

    return { ok: true };
  });

  app.patch<{
    Params: { orderId: string };
    Body: { status: string; paymentMethod?: "cash" | "transfer"; finalPriceRub?: number };
  }>("/orders/:orderId/status", async (request) => {
    return prisma.order.update({
      where: { id: request.params.orderId },
      data: {
        status: request.body.status as never,
        paymentMethod: request.body.paymentMethod,
        finalPriceRub: request.body.finalPriceRub
      }
    });
  });
}
