import { Sidebar, MobileNav } from "@/components/dashboard/sidebar";
import { getPendingRecommendations } from "@/lib/data";
import { ThemeToggle } from "@/components/theme-toggle";
import { demoMode } from "@/lib/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pending = getPendingRecommendations().length;

  return (
    <div className="min-h-screen flex bg-muted/10">
      <Sidebar pendingCount={pending} />
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        {demoMode && (
          <div className="bg-primary/10 border-b border-primary/20 text-primary text-xs px-4 py-1.5 text-center">
            Demo mode — data is in-memory. Configure <code>DATABASE_URL</code> + Clerk keys for production.
          </div>
        )}
        <div className="flex-1 flex flex-col">
          <div className="h-14 border-b bg-background/60 backdrop-blur flex items-center justify-end gap-2 px-4 lg:px-6">
            <ThemeToggle />
          </div>
          {children}
        </div>
      </div>
      <MobileNav pendingCount={pending} />
    </div>
  );
}
