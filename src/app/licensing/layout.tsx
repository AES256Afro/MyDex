import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing & Licensing",
  description:
    "MyDex pricing plans for teams of all sizes. Open-source core with enterprise features for growing organizations.",
};

export default function LicensingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
