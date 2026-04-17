import { createServer } from "node:http";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { createApp } from "./app.js";

const app = createApp();
const server = createServer(app);

async function bootstrap() {
  await prisma.$connect();

  server.listen(env.PORT, () => {
    console.log(`BlockNote API listening on ${env.BACKEND_URL}`);
  });
}

bootstrap().catch(async (error) => {
  console.error("Failed to start server", error);
  await prisma.$disconnect();
  process.exit(1);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
