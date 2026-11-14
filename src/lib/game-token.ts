import { createHash } from "node:crypto";

export function tokenHash(request: Request): string | null {
  const token = request.headers.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  return token ? createHash("sha256").update(token).digest("hex") : null;
}
