import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import {
  DEFAULT_BACKEND_PORT,
  DEFAULT_FRONTEND_PORT,
  EnvKeys,
  LegacyEnvKeys,
  resolveUrl,
} from "./contracts/app-config";

export default defineConfig(({ mode }) => {
  const loadedEnv = loadEnv(mode, process.cwd(), "");
  const apiUrl =
    resolveUrl(
      loadedEnv,
      EnvKeys.apiUrl,
      LegacyEnvKeys.viteApiUrl,
      LegacyEnvKeys.viteApiBaseUrl,
    ) || `http://localhost:${DEFAULT_BACKEND_PORT}`;
  const appUrl =
    resolveUrl(
      loadedEnv,
      EnvKeys.appUrl,
      LegacyEnvKeys.frontendUrl,
      LegacyEnvKeys.viteAppUrl,
    ) || `http://localhost:${DEFAULT_FRONTEND_PORT}`;

  if (
    mode === "production" &&
    !resolveUrl(
      loadedEnv,
      EnvKeys.apiUrl,
      LegacyEnvKeys.viteApiUrl,
      LegacyEnvKeys.viteApiBaseUrl,
    )
  ) {
    throw new Error(
      `${EnvKeys.apiUrl} is required in .env.production for production builds.`,
    );
  }

  return {
    plugins: [react()],

    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(apiUrl),
      "import.meta.env.VITE_APP_URL": JSON.stringify(appUrl),
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@db": path.resolve(__dirname, "./db"),
        "@api": path.resolve(__dirname, "./api"),
        "@contracts": path.resolve(__dirname, "./contracts"),
        "@assets": path.resolve(__dirname, "./attached_assets"),
      },
    },

    server: {
      host: true,
      port: DEFAULT_FRONTEND_PORT,
      proxy: {
        "/api": {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    build: {
      outDir: "dist/public",
      emptyOutDir: true,
    },

    publicDir: "public",
  };
});
