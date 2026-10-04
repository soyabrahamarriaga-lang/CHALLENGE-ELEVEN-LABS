import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api/livekit": "http://127.0.0.1:3001",
      "/api/elevenlabs": "http://127.0.0.1:3001",
      "/api/vault": "http://127.0.0.1:3001",
    },
  },
  build: {
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        agent: fileURLToPath(new URL("./agent-session.html", import.meta.url)),
      },
    },
  },
  base: "./",
});
