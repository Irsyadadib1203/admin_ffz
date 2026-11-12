"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, User as UserIcon } from "lucide-react";
import { getStoredUser, AdminUser } from "@/lib/auth";

interface HeaderProps {
  onMenuClick?: () => void;
  sidebarOpen?: boolean;
}

export default function Header({ onMenuClick, sidebarOpen }: HeaderProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  if (pathname === "/login") return null;

  const pageTitle = () => {
    switch (pathname) {
      case "/":
        return "Dashboard Overview";
      case "/transactions":
        return "Transactions Center";
      case "/games":
        return "Games Catalog";
      case "/nominals":
        return "Nominals & Pricing";
      case "/digiflazz":
        return "Digiflazz Command Center";
      case "/kiosgamer":
        return "Kiosgamer Command Center";
      case "/providers":
        return "Providers Center";
      case "/ip-whitelist":
        return "IP Whitelist & Security Guard";
      case "/users":
        return "Users & Reseller Accounts";
      case "/deposits":
        return "Deposit Approvals";
      case "/payment-methods":
        return "Payment Gateways & Methods";
      case "/banners":
        return "Banner & Promo Management";
      case "/articles":
        return "Berita & Artikel";
      case "/docs":
        return "API Documentation H2H";
      case "/settings":
        return "System Logs & Settings";
      default:
        return "Admin Portal";
    }
  };

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Toggle Sidebar Button */}
        <button
          onClick={onMenuClick}
          className="p-2 -ml-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          title={sidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
          aria-label={sidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
        >
          <Menu className="w-5 h-5" />
        </button>

        <h2 className="text-base sm:text-lg font-bold text-white truncate max-w-[200px] sm:max-w-none">
          {pageTitle()}
        </h2>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Engine Active
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-white leading-none">
              {user?.name || "Administrator"}
            </p>
            <span className="text-[10px] text-slate-400 uppercase font-medium">
              {user?.role || "SUPERADMIN"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
