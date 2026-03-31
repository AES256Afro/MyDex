import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BrandingProvider } from "@/components/branding-provider";
import { RealtimeProvider } from "@/components/realtime-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BrandingProvider>
      <RealtimeProvider>
        <div className="min-h-screen bg-background">
          <Sidebar />
          <div className="lg:pl-64">
            <Topbar />
            <main className="p-3 sm:p-4 lg:p-6">{children}</main>
          </div>
        </div>
      </RealtimeProvider>
    </BrandingProvider>
  );
}
