import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./", // relative paths so it works on GitHub Pages and Vercel
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.js"],
  },
});
