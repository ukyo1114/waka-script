import {
  getDatabaseUrl,
  getNodeEnv,
  getPort,
  loadEnv,
} from "./config/index.js";
import { createPool } from "./db/index.js";
import { createRepositories } from "./repositories/create-repositories.js";
import { createServer } from "./server.js";

loadEnv();

const databaseUrl = getDatabaseUrl();
const port = getPort();
const nodeEnv = getNodeEnv();

const pool = createPool(databaseUrl);
const repos = createRepositories(pool);
const { httpServer } = createServer({ repos });

httpServer.listen(port, () => {
  const dbHost = (() => {
    try {
      return new URL(databaseUrl).host;
    } catch {
      return "(invalid DATABASE_URL)";
    }
  })();
  console.log(
    `@jinro/backend listening on http://localhost:${port} [${nodeEnv}] db=${dbHost}`,
  );
});
