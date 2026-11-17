
import type { PoolClient } from "pg";
import { getPool } from "./db";

export async function withUserTransaction<T>(
  userId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Mengatur identitas user untuk RLS selama transaksi ini.
    await client.query(
      "SELECT set_config('app.user_id', $1, TRUE)",
      [userId]
    );

    const result = await callback(client);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}