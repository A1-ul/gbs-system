import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const sharedProxy = {
  "/api": {
    target: "http://127.0.0.1:5001",
    changeOrigin: true,
    secure: false,
  },
  "/health": {
    target: "http://127.0.0.1:5001",
    changeOrigin: true,
    secure: false,
  },
  "/uploads": {
    target: "http://127.0.0.1:5001",
    changeOrigin: true,
    secure: false,
  },
  "/socket.io": {
    target: "http://127.0.0.1:5001",
    ws: true,
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-state": ["@reduxjs/toolkit", "react-redux", "axios"]
        }
      }
    }
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    strictPort: true,
    allowedHosts: true,
    proxy: sharedProxy,
  },
  preview: {
    port: 3000,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: sharedProxy,
  },
});
