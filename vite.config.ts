import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // The whole demo ships as one bundle (about 2.1 MB, 520 kB gzipped): Pulse plus the Recruit layer.
  build: { chunkSizeWarningLimit: 2400 },
});
