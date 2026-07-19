import { createServer } from "./server.js";

const { httpServer } = createServer();
const port = Number(process.env.PORT) || 3000;

httpServer.listen(port, () => {
  console.log(`@jinro/backend listening on http://localhost:${port}`);
});
