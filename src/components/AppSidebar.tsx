import { ShoppingCart, FileText, Package, BarChart3, Receipt, Users, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthContext";
import { Button } from "./ui/button";

const navItems = [
  { title: "Caisse", url: "/", icon: ShoppingCart },
  { title: "Crédit", url: "/credits", icon: FileText },
  { title: "Factures", url: "/factures", icon: Receipt },
  { title: "Inventaire", url: "/inventaire", icon: Package },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const adminNavItems = [
    ...navItems,
    { title: "Analytique", url: "/analytique", icon: BarChart3 },
    { title: "Travailleurs", url: "/workers", icon: Users },
  ];

  const currentNavItems = user?.role === "admin" ? adminNavItems : navItems;

  return (
    <aside className="w-48 min-h-screen bg-white flex flex-col border-r border-gray-200 shadow-sm z-20 font-sans">
      {/* Logout button top left as requested */}
      <div className="p-3 border-b border-gray-100 bg-gray-50/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full flex items-center justify-start gap-2 text-[#be123c] hover:bg-rose-50 hover:text-[#9f1239] font-bold"
        >
          <LogOut className="h-4 w-4" />
          <span>Déconnecter</span>
        </Button>
      </div>

      {/* Logo */}
      <div className="px-5 py-6 border-b border-gray-100 flex flex-col items-start">
        <h1 className="text-[28px] font-black tracking-tighter">
          <span className="text-[#be123c]">TABA</span><span className="text-gray-400">CO</span>
        </h1>
        {user && (
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            {user.role === 'admin' ? '🔥 Admin' : '👤 Worker'}: {user.username}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2">
        {currentNavItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm transition-all duration-200 group font-bold ${isActive
                ? "bg-[#be123c] text-white shadow-[0_4px_14px_0_rgba(190,18,60,0.3)] hover:-translate-y-0.5"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              activeClassName=""
            >
              <item.icon className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-400 group-hover:text-[#be123c]"}`} strokeWidth={isActive ? 2.5 : 2} />
              <span className="tracking-wide">{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-5 border-t border-gray-100 bg-gray-50/50">
        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">© 2026 TABACO · Algérie</p>
      </div>
    </aside>
  );
}
