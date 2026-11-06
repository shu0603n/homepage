import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const g = globalThis as unknown as { prisma: PrismaClient; pgPool: Pool };

if (!g.pgPool) {
  const connectionString = process.env.DATABASE_URL!;
  const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
  g.pgPool = new Pool({
    connectionString,
    max: isLocal ? 10 : 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    keepAlive: false,
    ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
  });
}

if (!g.prisma) {
  const adapter = new PrismaPg(g.pgPool);
  g.prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = g.prisma;
