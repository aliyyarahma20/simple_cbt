
import { Pool } from "pg";

const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
};

function createPool(): Pool {
  const requiredEnv = [
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
  ];

  for (const key of requiredEnv) {
    if (!process.env[key]) {
      throw new Error(`Environment variable ${key} belum diatur.`);
    }
  }

  return new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: false,
  });
}

export function getPool(): Pool {
  if (!globalForPg.pgPool) {
    globalForPg.pgPool = createPool();

    globalForPg.pgPool.on("error", (error) => {
      console.error("Unexpected PostgreSQL pool error:", error);
    });
  }

  return globalForPg.pgPool;
}