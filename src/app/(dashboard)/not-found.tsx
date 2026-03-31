import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="text-6xl font-bold text-muted-foreground/30">404</div>
      <h2 className="text-xl font-semibold">Page Not Found</h2>
      <p className="text-muted-foreground text-center max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
      </p>
      <Link href="/dashboard" className={cn(buttonVariants(), "gap-2")}>
        <Home className="h-4 w-4" /> Back to Dashboard
      </Link>
    </div>
  );
}
