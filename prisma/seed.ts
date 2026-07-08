import { PrismaClient } from "@prisma/client";
import { DEFAULT_FLEETS, DEFAULT_ZONES, buildDefaultTariffMatrix } from "../packages/shared/src/index";
import { seedBotTexts } from "../apps/api/src/domain/bot-texts";

const prisma = new PrismaClient();

async function main() {
  for (const zone of DEFAULT_ZONES) {
    await prisma.zone.upsert({
      where: { id: zone.id },
      create: zone,
      update: zone
    });
  }

  for (const fleet of DEFAULT_FLEETS) {
    const savedFleet = await prisma.fleet.upsert({
      where: { code: fleet.id },
      create: {
        code: fleet.id,
        name: fleet.name,
        isActive: fleet.isActive,
        monthlyFeeRub: fleet.monthlyFeeRub
      },
      update: {
        name: fleet.name,
        isActive: fleet.isActive,
        monthlyFeeRub: fleet.monthlyFeeRub
      }
    });

    for (const tariff of buildDefaultTariffMatrix(DEFAULT_ZONES)) {
      await prisma.tariffCell.upsert({
        where: {
          fleetId_fromZoneId_toZoneId: {
            fleetId: savedFleet.id,
            fromZoneId: tariff.fromZoneId,
            toZoneId: tariff.toZoneId
          }
        },
        create: {
          fleetId: savedFleet.id,
          fromZoneId: tariff.fromZoneId,
          toZoneId: tariff.toZoneId,
          priceRub: tariff.priceRub
        },
        update: {
          priceRub: tariff.priceRub
        }
      });
    }
  }

  await seedBotTexts();
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
