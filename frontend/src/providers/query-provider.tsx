"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // Lecturas: un reintento. Mutaciones: ninguno (evita duplicados, CL-18).
      queries: { retry: 1, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster richColors closeButton position="bottom-right" />
    </QueryClientProvider>
  );
}
