"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { Lock, ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { getStoredUser } from "@/lib/auth";
import { api } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

const pathToResourceMap: Record<string, string> = {
  "/": "dashboard",
  "/transactions": "transactions",
  "/games": "games",
  "/nominals": "nominals",
  "/banners": "banners",
  "/articles": "articles",
  "/digiflazz": "digiflazz",
  "/kiosgamer": "kiosgamer",
  "/ip-whitelist": "ip_whitelist",
  "/users": "users",
  "/deposits": "deposits",
  "/payment-methods": "payment_methods",
  "/docs": "docs",
  "/settings": "settings",
  "/currencies": "settings",
  "/providers": "settings",
  "/voca": "settings",
  "/roles": "roles",
};

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        const saved = localStorage.getItem("topup_admin_sidebar_open");
        if (saved !== null) {
          setSidebarOpen(saved === "true");
        }
      }
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (typeof window !== "undefined" && window.innerWidth >= 768) {
        localStorage.setItem("topup_admin_sidebar_open", String(next));
      }
      return next;
    });
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      localStorage.setItem("topup_admin_sidebar_open", "false");
    }
  };

  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === "superadmin";

  const { data: permData, isLoading: isPermLoading } = useSWR(
    currentUser && !isSuperAdmin ? "/admin/rbac/my-permissions" : null,
    fetcher
  );

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (isLoginPage) {
      setChecked(true);
      return;
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("topup_admin_token")
        : null;
    const user = getStoredUser();

    if (!token || !user) {
      router.replace("/login");
      return;
    }

    setChecked(true);
  }, [isLoginPage, router]);

  // Halaman login: render polos, tanpa sidebar/header/padding admin panel.
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Tunggu pengecekan auth token selesai dulu sebelum render
  if (!checked) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950">
        <p className="text-sm text-slate-400">Memeriksa sesi login...</p>
      </div>
    );
  }

  // Check RBAC route authorization
  let isAccessDenied = false;
  if (!isSuperAdmin) {
    if (pathname === "/roles") {
      isAccessDenied = true;
    } else {
      const requiredResource = pathToResourceMap[pathname];
      if (
        requiredResource &&
        permData?.permissions &&
        !permData.permissions.includes(requiredResource)
      ) {
        isAccessDenied = true;
      }
    }
  }

  return (
    <>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
        sidebarOpen ? "pl-0 md:pl-64" : "pl-0"
      }`}>
        <Header onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {isAccessDenied ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl max-w-lg mx-auto mt-12 space-y-4 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-white">Akses Ditolak (403)</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Role akun Anda (<strong>{currentUser?.role}</strong>) tidak memiliki izin untuk
                mengakses halaman ini. Silakan hubungi <strong>SuperAdmin</strong> jika Anda memerlukan akses ke fitur ini.
              </p>
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke Dashboard</span>
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </>
  );
}
