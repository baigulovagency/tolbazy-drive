import cors from "@fastify/cors";
import Fastify from "fastify";
import { createTelegramBot } from "./bot/bot";
import { registerAdminRoutes } from "./routes/admin";
import { registerOrderRoutes } from "./routes/orders";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true
});

await registerAdminRoutes(app);
await registerOrderRoutes(app);

app.get("/health", async () => ({ ok: true, service: "tolbazy-drive-api" }));

const host = process.env.API_HOST ?? "0.0.0.0";
const port = Number(process.env.API_PORT ?? 4000);

if (process.env.TELEGRAM_BOT_TOKEN) {
  const { bot } = createTelegramBot(process.env.TELEGRAM_BOT_TOKEN);
  bot.start();
  app.log.info("Telegram bot started");
} else {
  app.log.warn("TELEGRAM_BOT_TOKEN is empty, bot is not started");
}

await app.listen({ host, port });
