/**
 * Sanitized reconstruction based on implemented systems.
 * Not verbatim production code.
 */

import { createPool } from "./db.js";
import { processOneEvent } from "./outbox.js";

const pool = createPool();
let stopped = false;
const stop = () => {
  stopped = true;
};
process.once("SIGTERM", stop);
process.once("SIGINT", stop);

while (!stopped) {
  const processed = await processOneEvent(pool);
  if (!processed) await new Promise((resolve) => setTimeout(resolve, 500));
}
await pool.end();
