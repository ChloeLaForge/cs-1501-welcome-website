import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Forwards same-origin /api/* calls (see src/lib/aiFriendClient.ts) to
    // the local Node server started by `npm run dev:server` (server/
    // aiServer.ts), which `npm run dev` runs alongside Vite. A real
    // deployment would put both processes behind the same host/reverse
    // proxy so /api/* keeps resolving the same way.
    proxy: {
      "/api": "http://localhost:8790",
    },
  },
});
