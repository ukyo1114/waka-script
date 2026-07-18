import { randomInt } from "node:crypto";

/** crypto.randomInt で 000000〜999999 の6桁コードを返す。 */
export function createRandomCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
