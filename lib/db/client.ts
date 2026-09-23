import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const baseFetch = globalThis.fetch.bind(globalThis);

neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit) => {
  let last: unknown;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      return await baseFetch(input, init);
    } catch (error) {
      last = error;
      if (attempt === 5) break;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw last;
};

export function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}
