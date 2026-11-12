"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Users,
  LayoutDashboard,
  Receipt,
  Gamepad2,
  Tags,
  Image,
  Newspaper,
  Zap,
  Flame,
  Wallet,
  CreditCard,
  BookOpen,
  Settings,
  Sparkles,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import ConfirmModal from "@/components/ConfirmModal";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

const resourceMeta: Record<
  string,
  { name: string; description: string; icon: any; category: string }
> = {
  dashboard: {
    name: "Dashboard & Statistik",
    description: "Melihat grafik penjualan, omset harian, keuntungan, dan ringkasan transaksi.",
    icon: LayoutDashboard,
    category: "Utama",
  },
  transactions: {
    name: "Manajemen Transaksi",
    description: "Melihat pesanan, status SN/invoice, manual retry ke provider, refund, dan mark success.",
    icon: Receipt,
    category: "Transaksi",
  },
  deposits: {
    name: "Deposit Saldo Member",
    description: "Melihat mutasi saldo, menyetujui (approve), dan menolak (reject) top-up deposit member.",
    icon: Wallet,
    category: "Transaksi",
  },
  games: {
    name: "Katalog Game",
    description: "Menambah, mengedit informasi, banner, dan mengelola daftar game yang aktif.",
    icon: Gamepad2,
    category: "Produk & Harga",
  },
  nominals: {
    name: "Nominal & Multi-Tier Pricing",
    description: "Mengatur harga jual publik, member, VIP, reseller, dan fitur switch provider.",
    icon: Tags,
    category: "Produk & Harga",
  },
  digiflazz: {
    name: "Digiflazz Center",
    description: "Sinkronisasi otomatis produk/harga dari Digiflazz, cek saldo, dan webhook H2H.",
    icon: Zap,
    category: "Integrasi Provider",
  },
  kiosgamer: {
    name: "Kiosgamer Center",
    description: "Mengelola session Garena SSO, TOTP 2FA, dan auto-sync SKU Free Fire & CODM.",
    icon: Flame,
    category: "Integrasi Provider",
  },
  users: {
    name: "Manajemen User & Reseller",
    description: "Melihat daftar member, mengubah tier (VIP/Reseller), dan menambah saldo manual.",
    icon: Users,
    category: "Pengguna & Keamanan",
  },
  ip_whitelist: {
    name: "IP Whitelist & Firewall",
    description: "Mengatur IP whitelist untuk API H2H, melihat log akses, dan memblokir IP mencurigakan.",
    icon: ShieldCheck,
    category: "Pengguna & Keamanan",
  },
  banners: {
    name: "Banner Promo",
    description: "Mengunggah dan mengatur banner promosi slider di halaman utama storefront.",
    icon: Image,
    category: "Konten & Tampilan",
  },
  articles: {
    name: "Berita & Artikel SEO",
    description: "Membuat dan mempublikasikan artikel berita, tips game, dan update promo.",
    icon: Newspaper,
    category: "Konten & Tampilan",
  },
  payment_methods: {
    name: "Metode Pembayaran",
    description: "Mengatur gateway pembayaran Tripay, biaya admin (fee), dan metode QRIS/E-Wallet.",
    icon: CreditCard,
    category: "Sistem & Konfigurasi",
  },
  docs: {
    name: "Dokumentasi API (H2H)",
    description: "Melihat petunjuk integrasi endpoint Open API JSON & Signature untuk reseller.",
    icon: BookOpen,
    category: "Sistem & Konfigurasi",
  },
  settings: {
    name: "Log Sistem & Pengaturan",
    description: "Melihat riwayat webhook log, log error server, dan konfigurasi sensitif backend.",
    icon: Settings,
    category: "Sistem & Konfigurasi",
  },
};

export default function RolesManagementPage() {
  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === "superadmin";

  const { data: rbacData, mutate: refreshMatrix, isLoading } = useSWR(
    isSuperAdmin ? "/admin/rbac/permissions" : null,
    fetcher
  );

  const [selectedRole, setSelectedRole] = useState<"admin" | "operator">("admin");
  const [localMatrix, setLocalMatrix] = useState<Record<string, Record<string, boolean>>>({
    admin: {},
    operator: {},
  });

  const [isSaving, setIsSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Sync server matrix to local state
  useEffect(() => {
    if (rbacData?.matrix) {
      setLocalMatrix({
        admin: { ...rbacData.matrix.admin },
        operator: { ...rbacData.matrix.operator },
      });
      setHasChanges(false);
    }
  }, [rbacData]);

  const handleToggle = (resource: string) => {
    setLocalMatrix((prev) => {
      const current = !!prev[selectedRole]?.[resource];
      return {
        ...prev,
        [selectedRole]: {
          ...prev[selectedRole],
          [resource]: !current,
        },
      };
    });
    setHasChanges(true);
  };

  const handleToggleAllCategory = (category: string, enable: boolean) => {
    const resourcesInCat = Object.entries(resourceMeta)
      .filter(([_, meta]) => meta.category === category)
      .map(([res]) => res);

    setLocalMatrix((prev) => {
      const updatedRoleMap = { ...prev[selectedRole] };
      resourcesInCat.forEach((res) => {
        updatedRoleMap[res] = enable;
      });
      return {
        ...prev,
        [selectedRole]: updatedRoleMap,
      };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setConfirmSave(false);
    setIsSaving(true);
    setActionMessage(null);

    const payload: Array<{ role: string; resource: string; allowed: boolean }> = [];
    (["admin", "operator"] as const).forEach((role) => {
      Object.keys(resourceMeta).forEach((res) => {
        payload.push({
          role,
          resource: res,
          allowed: !!localMatrix[role]?.[res],
        });
      });
    });

    try {
      await api.post("/admin/rbac/permissions", { permissions: payload });
      setActionMessage({
        type: "success",
        text: "Matriks hak akses role berhasil disimpan dan diterapkan langsung ke seluruh staf!",
      });
      setHasChanges(false);
      refreshMatrix();
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: "Gagal menyimpan hak akses: " + (err.response?.data?.message || err.message),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    setLocalMatrix({
      admin: {
        dashboard: true,
        transactions: true,
        games: true,
        nominals: true,
        banners: true,
        articles: true,
        digiflazz: true,
        kiosgamer: true,
        users: true,
        deposits: true,
        payment_methods: true,
        docs: true,
        ip_whitelist: false,
        settings: false,
      },
      operator: {
        dashboard: true,
        transactions: true,
        deposits: true,
        docs: true,
        games: false,
        nominals: false,
        banners: false,
        articles: false,
        digiflazz: false,
        kiosgamer: false,
        users: false,
        ip_whitelist: false,
        payment_methods: false,
        settings: false,
      },
    });
    setHasChanges(true);
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl max-w-lg mx-auto mt-10 space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Akses Ditolak (403)</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Halaman Manajemen Hak Akses & Role hanya dapat dikonfigurasi secara eksklusif oleh akun <strong>SuperAdmin</strong>.
        </p>
      </div>
    );
  }

  const categories = Array.from(new Set(Object.values(resourceMeta).map((m) => m.category)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white">Manajemen Akses & Role (RBAC)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Kendalikan hak akses menu dan fitur secara dinamis untuk akun <strong>Admin</strong> dan <strong>Operator</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmSave(true)}
            disabled={isSaving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Menyimpan..." : "Simpan Perubahan Akses"}</span>
          </button>
        </div>
      </div>

      {/* Notification banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-lg ${
            actionMessage.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            )}
            <span className="font-medium leading-relaxed">{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Role Overview & Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Superadmin Info Card */}
        <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">SuperAdmin</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
              Full Access (100%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Role pemilik dengan akses tak terbatas ke semua fitur backend, database, dan satu-satunya yang dapat mengelola halaman RBAC ini.
          </p>
        </div>

        {/* Admin Tab Selector Card */}
        <button
          type="button"
          onClick={() => setSelectedRole("admin")}
          className={`p-4 rounded-2xl border text-left transition-all space-y-2 ${
            selectedRole === "admin"
              ? "bg-slate-900 border-amber-500/50 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30"
              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Role: Admin
            </span>
            {selectedRole === "admin" && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                Sedang Diedit
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Administrator staf umum untuk mengelola produk, transaksi, user, dan konten promosi.
          </p>
        </button>

        {/* Operator Tab Selector Card */}
        <button
          type="button"
          onClick={() => setSelectedRole("operator")}
          className={`p-4 rounded-2xl border text-left transition-all space-y-2 ${
            selectedRole === "operator"
              ? "bg-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30"
              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Role: Operator
            </span>
            {selectedRole === "operator" && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                Sedang Diedit
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Tim operasional harian / Customer Service (fokus pada proses transaksi, deposit saldo, dan CS).
          </p>
        </button>
      </div>

      {/* Permission Matrix Table by Category */}
      <div className="space-y-6">
        {categories.map((category) => {
          const items = Object.entries(resourceMeta).filter(
            ([_, meta]) => meta.category === category
          );

          return (
            <div
              key={category}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
            >
              {/* Category Header */}
              <div className="px-5 py-3.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Kategori: {category}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleAllCategory(category, true)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                  >
                    Izinkan Semua
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => handleToggleAllCategory(category, false)}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                  >
                    Nonaktifkan Semua
                  </button>
                </div>
              </div>

              {/* Matrix List */}
              <div className="divide-y divide-slate-800/60">
                {items.map(([resourceKey, meta]) => {
                  const Icon = meta.icon;
                  const isAllowed = !!localMatrix[selectedRole]?.[resourceKey];

                  return (
                    <div
                      key={resourceKey}
                      className="p-4 sm:px-5 flex items-center justify-between gap-4 hover:bg-slate-850/30 transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                            isAllowed
                              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                              : "bg-slate-950 border-slate-800 text-slate-500"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{meta.name}</span>
                            <span className="text-[10px] font-mono text-slate-500">
                              ({resourceKey})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            {meta.description}
                          </p>
                        </div>
                      </div>

                      {/* Switch Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleToggle(resourceKey)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isAllowed ? "bg-indigo-600" : "bg-slate-800"
                        }`}
                        role="switch"
                        aria-checked={isAllowed}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            isAllowed ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Save Banner when there are unsaved changes */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-indigo-600 text-white shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom">
          <div className="text-xs">
            <span className="font-bold block">Ada perubahan hak akses yang belum disimpan!</span>
            <span className="text-indigo-200 text-[11px]">
              Klik tombol simpan agar perubahan diterapkan pada role staf.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setConfirmSave(true)}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 text-xs font-bold shadow-md transition-all"
          >
            {isSaving ? "Menyimpan..." : "Simpan Sekarang"}
          </button>
        </div>
      )}

      {/* Confirm Save Modal */}
      <ConfirmModal
        isOpen={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={handleSave}
        title="Simpan Matriks Hak Akses?"
        message={
          <>
            Perubahan hak akses untuk role <strong>{selectedRole.toUpperCase()}</strong> akan langsung
            berlaku ke semua akun staf terkait di database.
          </>
        }
        confirmText="Ya, Terapkan Hak Akses"
        cancelText="Batal"
        variant="primary"
        isLoading={isSaving}
      />
    </div>
  );
}
