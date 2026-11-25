
import type { NextRequest } from "next/server";
import type { PoolClient } from "pg";
import { NextResponse } from "next/server";
import { withUserTransaction } from "./db-transaction";
import { verifyToken, type AppRole } from "./jwt";

export interface AuthenticatedUser {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
}

type AuthResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

export async function withAuthenticatedUser<T>(
  request: NextRequest,
  callback: (
    client: PoolClient,
    user: AuthenticatedUser
  ) => Promise<T>
): Promise<AuthResult<T>> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: "Token autentikasi tidak ditemukan." },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: "Token autentikasi tidak valid." },
        { status: 401 }
      ),
    };
  }

  let decoded: ReturnType<typeof verifyToken>;

  try {
    decoded = verifyToken(token);
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: "Token tidak valid atau kedaluwarsa." },
        { status: 401 }
      ),
    };
  }

  try {
    const data = await withUserTransaction(
      decoded.sub,
      async (client) => {
        const result = await client.query<AuthenticatedUser>(
          `SELECT id, full_name, email, role
           FROM public.users
           WHERE id = $1 AND is_active = TRUE
           LIMIT 1`,
          [decoded.sub]
        );

        if (result.rows.length === 0) {
          throw new Error("ACCOUNT_INACTIVE_OR_NOT_FOUND");
        }

        const user = result.rows[0];

        if (user.role !== decoded.role) {
          throw new Error("TOKEN_ROLE_MISMATCH");
        }

        return callback(client, user);
      }
    );

    return { success: true, data };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ACCOUNT_INACTIVE_OR_NOT_FOUND"
    ) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            message: "Akun tidak ditemukan atau sudah tidak aktif.",
          },
          { status: 401 }
        ),
      };
    }

    if (
      error instanceof Error &&
      error.message === "TOKEN_ROLE_MISMATCH"
    ) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, message: "Token autentikasi tidak valid." },
          { status: 401 }
        ),
      };
    }

    console.error("Authentication error:", error);

    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: "Gagal memverifikasi akun." },
        { status: 500 }
      ),
    };
  }
}