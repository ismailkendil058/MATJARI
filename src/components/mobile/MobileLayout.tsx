import { BarChart3, FileText, Package, Receipt, ShoppingCart } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthContext";

const mobileNavItems = [
  { title: "Caisse", url: "/", icon: ShoppingCart },
  { title: "Bons", url: "/bons", icon: FileText },
  { title: "Factures", url: "/factures", icon: Receipt },
  { title: "Stock", url: "/inventaire", icon: Package },
];

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();

  const adminMobileNavItems = [
    ...mobileNavItems,
    { title: "Stats", url: "/analytique", icon: BarChart3 },
  ];

  const currentNavItems = user?.role === "admin" ? adminMobileNavItems : mobileNavItems;

  return (
    <div className="min-h-screen bg-[#fdf8f8] text-gray-900">
      <main className="mobile-safe-bottom min-h-screen">{children}</main>
      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2 rounded-t-[2rem] border border-white/70 bg-[#3b0b0b]/95 px-4 py-3 shadow-[0_-14px_40px_rgba(59,11,11,0.2)] backdrop-blur-xl">
          {currentNavItems.map(item => {
            const isActive = location.pathname === item.url;
            return (
              <NavLink
                key={item.url}
                to={item.url}
                end
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition-all ${isActive ? "bg-[#be123c] text-white shadow-[0_10px_24px_rgba(190,18,60,0.3)]" : "text-white/70"
                  }`}
              >
                <item.icon className="h-4 w-4" strokeWidth={2.2} />
                <span className="truncate">{item.title}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
