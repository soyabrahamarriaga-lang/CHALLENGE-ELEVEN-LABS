import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  define: {
    "import.meta.env.VITE_CLOUD_DEMO": JSON.stringify(process.env.VERCEL === "1" || process.env.VITE_CLOUD_DEMO === "true" ? "true" : "false"),
  },
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
