import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendTarget = "http://localhost:3000";

const apiPrefixes = [
  "/user",
  "/email",
  "/avatar",
  "/channel",
  "/message",
  "/game",
  "/health",
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: Object.fromEntries(
      apiPrefixes.map((prefix) => [
        prefix,
        { target: backendTarget, changeOrigin: true },
      ]),
    ),
  },
});
