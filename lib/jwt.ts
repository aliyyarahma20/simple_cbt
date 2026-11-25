
import jwt, { type JwtPayload } from "jsonwebtoken";

export type AppRole = "POKJA" | "GURU";

export interface AuthTokenPayload {
  sub: string;
  role: AppRole;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET belum diatur di .env.local");
  }

  return secret;
}

export function generateToken(user: {
  id: string;
  role: AppRole;
}): string {
  return jwt.sign(
    { role: user.role },
    getJwtSecret(),
    {
      subject: user.id,
      expiresIn: "8h",
    }
  );
}

export function verifyToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret());

  if (
    typeof decoded === "string" ||
    !decoded.sub ||
    (decoded.role !== "POKJA" && decoded.role !== "GURU")
  ) {
    throw new Error("Payload JWT tidak valid.");
  }

  return {
    sub: decoded.sub,
    role: decoded.role,
  };
}