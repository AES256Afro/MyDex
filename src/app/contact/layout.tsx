import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Sales",
  description:
    "Get in touch with the MyDex team. Request a demo, ask about pricing, or discuss your digital employee experience needs.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
