import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    allowedHosts: ["qualiq.inmedsa.com"],
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  preview: {
    host: "::",
    allowedHosts: ["qualiq.inmedsa.com"],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
