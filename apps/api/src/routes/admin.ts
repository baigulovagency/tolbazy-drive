import type { FastifyInstance } from "fastify";
import { prisma } from "../db";
import { reloadBotTexts } from "../domain/bot-texts.js";

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get("/admin/bootstrap", async () => {
    const [fleets, zones] = await Promise.all([
      prisma.fleet.findMany({ orderBy: { name: "asc" } }),
      prisma.zone.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] })
    ]);

    return { fleets, zones };
  });

  app.get("/admin/fleets", async () => {
    return prisma.fleet.findMany({ orderBy: { name: "asc" } });
  });

  app.post<{
    Body: {
      code: string;
      name: string;
      dispatcherPhone?: string;
      monthlyFeeRub?: number;
    };
  }>("/admin/fleets", async (request) => {
    const fleet = await prisma.fleet.create({
      data: {
        code: request.body.code,
        name: request.body.name,
        dispatcherPhone: request.body.dispatcherPhone,
        monthlyFeeRub: request.body.monthlyFeeRub ?? 0,
        isActive: true
      }
    });

    const zones = await prisma.zone.findMany();
    const tariffs = zones.flatMap((fromZone) =>
      zones.map((toZone) => ({
        fleetId: fleet.id,
        fromZoneId: fromZone.id,
        toZoneId: toZone.id,
        priceRub: fromZone.type === "tolbazy" && toZone.type === "tolbazy" ? 150 : 300
      }))
    );

    await prisma.tariffCell.createMany({ data: tariffs });

    return fleet;
  });

  app.get<{ Params: { fleetId: string } }>("/admin/fleets/:fleetId/tariffs", async (request) => {
    return prisma.tariffCell.findMany({
      where: { fleetId: request.params.fleetId },
      include: { fromZone: true, toZone: true },
      orderBy: [{ fromZoneId: "asc" }, { toZoneId: "asc" }]
    });
  });

  app.patch<{
    Params: { tariffId: string };
    Body: { priceRub: number };
  }>("/admin/tariffs/:tariffId", async (request) => {
    return prisma.tariffCell.update({
      where: { id: request.params.tariffId },
      data: { priceRub: request.body.priceRub }
    });
  });

  app.get("/admin/bot-texts", async () => {
    return prisma.botText.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }]
    });
  });

  app.put<{
    Params: { key: string };
    Body: { body: string };
  }>("/admin/bot-texts/:key", async (request, reply) => {
    const existing = await prisma.botText.findUnique({
      where: { key: request.params.key }
    });

    if (!existing) {
      reply.code(404);
      return { error: "Text key not found" };
    }

    const updated = await prisma.botText.update({
      where: { key: request.params.key },
      data: { body: request.body.body }
    });

    await reloadBotTexts();

    return updated;
  });
}
