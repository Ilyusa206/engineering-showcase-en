/**
 * Sanitized reconstruction based on implemented systems.
 * Not verbatim production code.
 */

import { buildApp } from "./app.js";
import { createPool } from "./db.js";

const pool = createPool();
const app = buildApp(pool);
const port = Number(process.env.PORT ?? 4100);

const close = async () => {
  await app.close();
  await pool.end();
};
process.once("SIGTERM", () => void close());
process.once("SIGINT", () => void close());

await app.listen({ host: "0.0.0.0", port });
