import { AppSidebar } from "./AppSidebar";
import { MobileLayout } from "./mobile/MobileLayout";
import { useIsMobile } from "@/hooks/useIsMobile";

export function Layout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
