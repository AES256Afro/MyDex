import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Demo",
  description:
    "Explore MyDex's full feature set with our interactive demo. See real-time monitoring, device management, productivity analytics, and 30+ modules in action.",
  openGraph: {
    title: "MyDex Live Demo - Interactive Product Tour",
    description:
      "Try all 30+ modules: fleet health, SOC 2 compliance, time tracking, MDM integration, and more.",
  },
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
