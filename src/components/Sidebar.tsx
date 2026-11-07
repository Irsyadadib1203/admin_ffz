"use client";

import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import {
  LayoutDashboard,
  Gamepad2,
  Tags,
  Zap,
  Flame,
  ShieldCheck,
  Receipt,
  Users,
  Wallet,
  CreditCard,
  Settings,
  LogOut,
  Image,
  Newspaper,
  BookOpen,
  X,
  ShieldAlert,
  CircleDollarSign,
  Scale,
  Coins,
} from "lucide-react";
import { clearAuthSession, getStoredUser } from "@/lib/auth";
import { api } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

interface NavItem {
  name: string;
  href: string;
  icon: any;
  resource: string;
}

const allNavItems: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, resource: "dashboard" },
  { name: "Keuangan", href: "/keuangan", icon: CircleDollarSign, resource: "finance" },
  { name: "Transactions", href: "/transactions", icon: Receipt, resource: "transactions" },
  { name: "Games Catalog", href: "/games", icon: Gamepad2, resource: "games" },
  { name: "Nominals & Prices", href: "/nominals", icon: Tags, resource: "nominals" },
  { name: "Perbandingan Harga", href: "/price-compare", icon: Scale, resource: "nominals" },
  { name: "Banner & Promo", href: "/banners", icon: Image, resource: "banners" },
  { name: "Berita & Artikel", href: "/articles", icon: Newspaper, resource: "articles" },
  { name: "Providers Center", href: "/providers", icon: Zap, resource: "settings" },
  { name: "Mata Uang & Kurs", href: "/currencies", icon: Coins, resource: "settings" },
  { name: "IP Whitelist & Security", href: "/ip-whitelist", icon: ShieldCheck, resource: "ip_whitelist" },
  { name: "Users & Resellers", href: "/users", icon: Users, resource: "users" },
  { name: "Deposits", href: "/deposits", icon: Wallet, resource: "deposits" },
  { name: "Payment Gateways", href: "/payment-methods", icon: CreditCard, resource: "payment_methods" },
  { name: "Hak Akses & Role", href: "/roles", icon: ShieldAlert, resource: "roles" },
  { name: "API Docs (H2H)", href: "/docs", icon: BookOpen, resource: "docs" },
  { name: "Logs & Settings", href: "/settings", icon: Settings, resource: "settings" },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === "superadmin";

  const { data: permData } = useSWR(
    currentUser ? "/admin/rbac/my-permissions" : null,
    fetcher
  );

  // Hide sidebar on login page
  if (pathname === "/login") return null;

  // Filter accessible navigation items
  const accessibleItems = allNavItems.filter((item) => {
    // Roles management is strictly for superadmin
    if (item.resource === "roles") {
      return isSuperAdmin;
    }
    // Superadmin has access to everything
    if (isSuperAdmin) {
      return true;
    }
    // If permission data is still loading, allow dashboard and finance as safe fallback
    if (!permData?.permissions) {
      return item.resource === "dashboard" || item.resource === "finance";
    }
    if (item.resource === "finance") {
      return (
        permData.permissions.includes("finance") ||
        permData.permissions.includes("dashboard") ||
        permData.permissions.includes("transactions")
      );
    }
    return permData.permissions.includes(item.resource);
  });

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0 shadow-2xl shadow-black/80 md:shadow-none" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <NextImage
              src="/logo.png"
              alt="IRXPlay Logo"
              width={34}
              height={34}
              className="object-contain"
              priority
            />
            <div>
              <h1 className="font-bold text-sm text-white leading-none">IRXPlay Admin</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-indigo-400 font-medium">Golang Engine</span>
                {currentUser?.role && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                    {currentUser.role}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Tutup sidebar"
            aria-label="Tutup sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {accessibleItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const isRoleItem = item.resource === "roles";

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => {
                  if (typeof window !== "undefined" && window.innerWidth < 768) {
                    onClose?.();
                  }
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? isRoleItem
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : isRoleItem
                    ? "text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? "text-white"
                      : isRoleItem
                      ? "text-indigo-400"
                      : "text-slate-400"
                  }`}
                />
                <span className="flex-1">{item.name}</span>
                {isRoleItem && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300">
                    Super
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={clearAuthSession}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
}
