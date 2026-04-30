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
    <aside className="w-80 h-screen sticky top-0 bg-white flex flex-col border-r border-gray-200 shadow-sm z-20 font-sans overflow-y-auto no-scrollbar">
      {/* Logout button top left as requested */}
      <div className="p-5 border-b border-gray-100 bg-gray-50/30">
        <Button
          variant="ghost"
          size="default"
          onClick={handleLogout}
          className="w-full flex items-center justify-start gap-4 text-primary hover:bg-primary/10 hover:text-primary/90 font-black text-xl py-8"
        >
          <LogOut className="h-7 w-7" />
          <span>Déconnecter</span>
        </Button>
      </div>

      {/* Logo */}
      <div className="px-8 py-12 border-b border-gray-100 flex flex-col items-start">
        <h1 className="text-[44px] font-black tracking-tighter leading-none">
          <span className="text-primary">Matjari</span> <br />
          <span className="text-gray-400 text-3xl font-bold uppercase tracking-[0.2em] mt-2">متجري</span>
        </h1>
        {user && (
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-6">
            {user.role === 'admin' ? '🔥 Admin' : '👤 Worker'}: {user.username}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-5 py-10 space-y-5">
        {currentNavItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end
              className={`flex items-center gap-5 px-6 py-5 rounded-2xl text-xl transition-all duration-200 group font-black ${isActive
                ? "bg-primary text-white shadow-xl shadow-primary/30 hover:-translate-y-1"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              activeClassName=""
            >
              <item.icon className={`h-8 w-8 ${isActive ? "text-white" : "text-gray-400 group-hover:text-primary"}`} strokeWidth={isActive ? 3 : 2} />
              <span className="tracking-wide">{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-6 border-t border-gray-100 bg-gray-50/50">
        <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">© 2026 Matjari متجري · Algérie</p>
      </div>
    </aside>
  );
}
