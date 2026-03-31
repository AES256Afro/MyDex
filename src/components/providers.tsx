"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          theme="system"
          toastOptions={{
            duration: 4000,
          }}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}
