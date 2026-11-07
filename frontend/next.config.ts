import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

export default function config(phase: string): NextConfig {
  // NEXT_PUBLIC_API_URL se incorpora al bundle en el build: si falta, el build
  // debe fallar con un mensaje claro en vez de producir una app rota.
  if (phase === PHASE_PRODUCTION_BUILD) {
    const url = process.env.NEXT_PUBLIC_API_URL;
    if (!url || !/^https?:\/\//.test(url)) {
      throw new Error(
        "Falta NEXT_PUBLIC_API_URL (URL absoluta del backend, ej. http://localhost:3001). Definila antes de ejecutar el build.",
      );
    }
  }

  return {
    cacheComponents: true,
    partialPrefetching: true,
    turbopack: {
      rules: {
        "*.css": {
          loaders: ["@tailwindcss/turbopack"],
          as: "*.css",
        },
      },
    },
  };
}
