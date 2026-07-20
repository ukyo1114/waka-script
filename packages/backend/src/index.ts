import { getDatabaseUrl, getNodeEnv, getPort, loadEnv } from "./config/index.js";
import { createServer } from "./server.js";

loadEnv();

// 本番では未設定時にここで失敗させる（接続クライアント導入前でも設定ミスを早期検知）
const databaseUrl = getDatabaseUrl();
const port = getPort();
const nodeEnv = getNodeEnv();

const { httpServer } = createServer();

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
