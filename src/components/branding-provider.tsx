"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface Branding {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  favicon: string;
  brandingMode: "replace" | "alongside";
}

const BrandingContext = createContext<Branding>({
  companyName: "MyDex",
  logoUrl: "",
  primaryColor: "",
  favicon: "",
  brandingMode: "replace",
});

export function useBranding() {
  return useContext(BrandingContext);
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Branding>({
    companyName: "MyDex",
    logoUrl: "",
    primaryColor: "",
    favicon: "",
    brandingMode: "replace",
  });

  useEffect(() => {
    async function fetchBranding() {
      try {
        const res = await fetch("/api/v1/branding");
        if (res.ok) {
          const data = await res.json();
          setBranding(data);
        }
      } catch {
        // Use defaults
      }
    }
    fetchBranding();
  }, []);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}
