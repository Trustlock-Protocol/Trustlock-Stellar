import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    // stellar-sdk needs this
    "process.env": {},
    global: "globalThis",
  },
});
