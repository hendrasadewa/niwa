import { verify } from "hono/jwt";
import type { NiwaJwtPayload } from "../types/auth";

export async function verifyNiwaToken(
  token: string,
  jwtSecret: string
): Promise<NiwaJwtPayload> {
  return (await verify(token, jwtSecret, "HS256")) as unknown as NiwaJwtPayload;
}
