"use client";

import { useState, useEffect } from "react";
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
  ChevronDown,
  ChevronRight,
  Layers,
} from "lucide-react";
import { clearAuthSession, getStoredUser } from "@/lib/auth";
import { api } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

interface SubNavItem {
  name: string;
  href: string;
  resource: string;
}

interface NavItem {
  name: string;
  href?: string;
  icon: any;
  resource: string;
  children?: SubNavItem[];
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
  { name: "Provider", href: "/providers", icon: Zap, resource: "settings" },
  {
    name: "Provider Center",
    icon: Layers,
    resource: "settings",
    children: [
      { name: "Kiosgamer Center", href: "/kiosgamer", resource: "kiosgamer" },
      { name: "Digiflazz Center", href: "/digiflazz", resource: "digiflazz" },
      { name: "Voca Center", href: "/voca", resource: "settings" },
    ],
  },
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

  const isProviderCenterActive =
    pathname.startsWith("/kiosgamer") || pathname.startsWith("/digiflazz") || pathname.startsWith("/voca");
  const [providerCenterExpanded, setProviderCenterExpanded] = useState(
    isProviderCenterActive
  );

  useEffect(() => {
    if (isProviderCenterActive) {
      setProviderCenterExpanded(true);
    }
  }, [pathname, isProviderCenterActive]);

  const { data: permData } = useSWR(
    currentUser ? "/admin/rbac/my-permissions" : null,
    fetcher
  );

  // Hide sidebar on login page
  if (pathname === "/login") return null;

  // Filter accessible navigation items
  const accessibleItems = allNavItems.filter((item) => {
    if (item.children) {
      if (isSuperAdmin) return true;
      return (
        item.children.some((child) =>
          permData?.permissions?.includes(child.resource)
        ) || permData?.permissions?.includes(item.resource)
      );
    }
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
            if (item.children) {
              const isParentActive = item.children.some((c) => pathname.startsWith(c.href));
              const Icon = item.icon;
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setProviderCenterExpanded((prev: boolean) => !prev)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isParentActive
                        ? "text-white bg-slate-800/80"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isParentActive ? "text-amber-400" : "text-slate-400"}`} />
                      <span>{item.name}</span>
                    </div>
                    {providerCenterExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 transition-transform" />
                    )}
                  </button>

                  {providerCenterExpanded && (
                    <div className="pl-6 pr-1 space-y-1 py-1 border-l border-slate-800 ml-4">
                      {item.children.map((child) => {
                        const isChildActive = pathname === child.href;
                        return (
                          <Link
                            key={child.name}
                            href={child.href}
                            onClick={() => {
                              if (typeof window !== "undefined" && window.innerWidth < 768) {
                                onClose?.();
                              }
                            }}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                              isChildActive
                                ? "bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/30"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isChildActive ? "bg-white" : "bg-slate-500"
                              }`}
                            />
                            <span>{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = pathname === item.href;
            const Icon = item.icon;
            const isRoleItem = item.resource === "roles";

            return (
              <Link
                key={item.name}
                href={item.href!}
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
