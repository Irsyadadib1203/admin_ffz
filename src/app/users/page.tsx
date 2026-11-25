"use client";

import { useState } from "react";
import useSWR from "swr";
import { createPortal } from "react-dom";
import { Users, Plus, Edit2, Key, Wallet, Shield, Check, X, Copy } from "lucide-react";
import { api } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";
import Pagination from "@/components/Pagination";

const paginatedFetcher = (url: string) => api.get(url).then((res) => res.data);

export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // 2FA Authenticator state untuk membuka modal edit
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [targetUserForEdit, setTargetUserForEdit] = useState<any | null>(null);
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAError, setTwoFAError] = useState<string | null>(null);

  // API Key management state di dalam modal edit
  const [isCopied, setIsCopied] = useState(false);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [confirmRegenerateKey, setConfirmRegenerateKey] = useState(false);

  // Confirmation states
  const [confirmEdit, setConfirmEdit] = useState<{
    isOpen: boolean;
    isLoading: boolean;
  }>({
    isOpen: false,
    isLoading: false,
  });

  const [confirmCreate, setConfirmCreate] = useState<{
    isOpen: boolean;
    isLoading: boolean;
  }>({
    isOpen: false,
    isLoading: false,
  });

  const { data: resData, mutate, isLoading } = useSWR(
    `/admin/users?page=${page}&limit=${limit}&role=${roleFilter}`,
    paginatedFetcher
  );

  const users = Array.isArray(resData?.data) ? resData.data : [];
  const totalItems = resData?.meta?.total ?? users.length;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone_number: "",
    role: "member",
    tier: "member",
    balance_adjustment: 0,
    adjustment_reason: "Penyesuaian saldo admin",
  });

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const requestOpenEdit = (user: any) => {
    setTargetUserForEdit(user);
    setTwoFACode("");
    setTwoFAError(null);
    setIs2FAModalOpen(true);
  };

  const handleVerify2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserForEdit) return;

    const trimmedCode = twoFACode.trim();
    if (trimmedCode.length !== 6) {
      setTwoFAError("Masukkan 6 digit kode authenticator.");
      return;
    }

    setTwoFALoading(true);
    setTwoFAError(null);

    try {
      const res = await api.post(
        `/admin/users/${targetUserForEdit.id}/verify-edit-2fa`,
        { code: trimmedCode }
      );
      const fullUserData = res.data.data;
      setIs2FAModalOpen(false);
      openEditModal(fullUserData);
    } catch (err: any) {
      setTwoFAError(
        err.response?.data?.message || "Kode verifikasi salah atau kedaluwarsa."
      );
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleGenerateApiKey = async () => {
    if (!selectedUser) return;
    setIsGeneratingKey(true);
    try {
      const res = await api.post(`/admin/users/${selectedUser.id}/generate-api-key`);
      const newApiKey = res.data.data;
      setSelectedUser((prev: any) => ({
        ...prev,
        api_key: newApiKey,
      }));
      setConfirmRegenerateKey(false);
      mutate();
    } catch (err: any) {
      alert("Gagal generate API Key: " + (err.response?.data?.message || err.message));
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const copyApiKey = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setIsCopied(false);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      phone_number: user.phone_number || "",
      role: user.role,
      tier: user.tier,
      balance_adjustment: 0,
      adjustment_reason: "Penyesuaian saldo admin",
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmEdit({ isOpen: true, isLoading: false });
  };

  const executeUpdateUser = async () => {
    if (!selectedUser) return;
    setConfirmEdit((prev) => ({ ...prev, isLoading: true }));
    try {
      await api.put(`/admin/users/${selectedUser.id}`, {
        name: formData.name,
        role: formData.role,
        tier: formData.tier,
        balance_adjustment: formData.balance_adjustment,
        adjustment_reason: formData.adjustment_reason,
      });
      setConfirmEdit({ isOpen: false, isLoading: false });
      setIsEditModalOpen(false);
      mutate();
    } catch (err: any) {
      setConfirmEdit((prev) => ({ ...prev, isLoading: false }));
      alert("Gagal update user: " + (err.response?.data?.message || err.message));
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.role === "admin" || formData.role === "superadmin") {
      setConfirmCreate({ isOpen: true, isLoading: false });
    } else {
      executeCreateUser();
    }
  };

  const executeCreateUser = async () => {
    setConfirmCreate((prev) => ({ ...prev, isLoading: true }));
    try {
      await api.post("/admin/users", formData);
      setConfirmCreate({ isOpen: false, isLoading: false });
      setIsCreateModalOpen(false);
      mutate();
    } catch (err: any) {
      setConfirmCreate((prev) => ({ ...prev, isLoading: false }));
      alert("Gagal tambah user: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">
            Pengguna & Akun Reseller Mitra
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola peran hak akses (Admin/Operator/Reseller) dan Saldo
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Semua Peran</option>
            <option value="superadmin">Superadmin</option>
            <option value="admin">Admin</option>
            <option value="operator">Operator</option>
            <option value="reseller">Reseller H2H</option>
            <option value="member">Member</option>
          </select>

          <button
            onClick={() => {
              setFormData({
                name: "",
                email: "",
                password: "",
                phone_number: "",
                role: "member",
                tier: "member",
                balance_adjustment: 0,
                adjustment_reason: "",
              });
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            Tambah Pengguna
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
              <th className="py-3.5 px-5">Pengguna</th>
              <th className="py-3.5 px-4">Role & Akses</th>
              <th className="py-3.5 px-4">Saldo Akun</th>
              <th className="py-3.5 px-4">API Key H2H</th>
              <th className="py-3.5 px-5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {users && users.length > 0 ? (
              users.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-3.5 px-5">
                    <div>
                      <span className="font-semibold text-white text-sm block">
                        {u.name}
                      </span>
                      <span className="text-slate-400 text-[11px] block">{u.email}</span>
                      {u.phone_number && (
                        <span className="text-slate-500 text-[10px]">
                          {u.phone_number}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === "superadmin"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : u.role === "admin"
                          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          : u.role === "reseller"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-emerald-400">
                    {formatRupiah(u.balance)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px]">
                    {u.api_key ? (
                      <div
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400 select-none cursor-default"
                        style={{ userSelect: "none", WebkitUserSelect: "none" }}
                        onCopy={(e) => e.preventDefault()}
                        title="API Key disensor (Hanya dapat dicek/disalin dari Modal Edit)"
                      >
                        <Shield className="w-3 h-3 text-amber-400/80 flex-shrink-0" />
                        <span className="font-mono text-[11px] tracking-widest text-slate-400 select-none pointer-events-none">
                          ••••••••••••••••
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => requestOpenEdit(u)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Edit Pengguna (Verifikasi 2FA)"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-500">
                  {isLoading ? "Memuat pengguna..." : "Tidak ada pengguna."}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Dynamic Pagination */}
        <Pagination
          currentPage={page}
          totalItems={totalItems}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          isLoading={isLoading}
        />
      </div>

      {/* Modal Edit User & Balance */}
      {isEditModalOpen && selectedUser &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setIsEditModalOpen(false)}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">
                  Edit Pengguna & Saldo: {selectedUser.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Role Akun
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none"
                  >
                    <option value="member">Member</option>
                    <option value="reseller">Reseller H2H</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>

                {/* Balance Adjustment Section */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-bold text-amber-400 block">
                    Penyesuaian Saldo Akun (Saat ini: {formatRupiah(selectedUser.balance)})
                  </span>

                  <div>
                    <label className="block text-slate-400 mb-1">
                      Tambah (+) atau Kurang (-) Saldo Rp
                    </label>
                    <input
                      type="number"
                      value={formData.balance_adjustment}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          balance_adjustment: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-slate-100 font-semibold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">
                      Keterangan Mutasi
                    </label>
                    <input
                      type="text"
                      value={formData.adjustment_reason}
                      onChange={(e) =>
                        setFormData({ ...formData, adjustment_reason: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                {/* H2H API Key Section */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] font-bold text-slate-200">
                        API Key H2H Mitra
                      </span>
                    </div>
                    {selectedUser.api_key && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        Aktif
                      </span>
                    )}
                  </div>

                  {selectedUser.api_key ? (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          API Key User
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={selectedUser.api_key.key}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-slate-100 font-mono text-[11px] focus:outline-none select-all"
                          />
                          <button
                            type="button"
                            onClick={() => copyApiKey(selectedUser.api_key.key)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 font-semibold text-xs whitespace-nowrap transition-colors"
                            title="Salin API Key"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          Ingin memperbarui API Key akun ini?
                        </span>
                        <button
                          type="button"
                          onClick={() => setConfirmRegenerateKey(true)}
                          disabled={isGeneratingKey}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-medium underline underline-offset-2 disabled:opacity-50"
                        >
                          {isGeneratingKey ? "Memproses..." : "Regenerate API Key"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                      <p className="text-[11px] text-slate-400">
                        Pengguna ini belum memiliki API Key H2H.
                      </p>
                      <button
                        type="button"
                        onClick={handleGenerateApiKey}
                        disabled={isGeneratingKey}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors disabled:opacity-50"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>{isGeneratingKey ? "Membuat..." : "Generate API Key"}</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal Create User */}
      {isCreateModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setIsCreateModalOpen(false)}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">Tambah Pengguna Baru</h3>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Role Akun
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none"
                  >
                    <option value="member">Member</option>
                    <option value="reseller">Reseller H2H</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30"
                  >
                    Buat Pengguna
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Confirmation Modal - Edit User / Balance Adjustment */}
      <ConfirmModal
        isOpen={confirmEdit.isOpen}
        onClose={() => setConfirmEdit({ isOpen: false, isLoading: false })}
        onConfirm={executeUpdateUser}
        title="Simpan Perubahan Akun & Saldo?"
        message={
          <>
            Perubahan untuk akun <strong className="text-white">{selectedUser?.name}</strong>:
            <ul className="mt-2 space-y-1 text-slate-300">
              <li>• Role: <span className="font-semibold text-indigo-300 uppercase">{formData.role}</span></li>
              {formData.balance_adjustment !== 0 && (
                <li className="text-amber-400 font-bold">
                  • Penyesuaian Saldo: {formData.balance_adjustment > 0 ? "+" : ""}{formatRupiah(formData.balance_adjustment)}
                </li>
              )}
            </ul>
          </>
        }
        confirmText="Ya, Simpan Perubahan"
        cancelText="Periksa Lagi"
        variant={formData.balance_adjustment !== 0 ? "warning" : "primary"}
        isLoading={confirmEdit.isLoading}
      />

      {/* Confirmation Modal - Create Admin User */}
      <ConfirmModal
        isOpen={confirmCreate.isOpen}
        onClose={() => setConfirmCreate({ isOpen: false, isLoading: false })}
        onConfirm={executeCreateUser}
        title="Buat Akun dengan Hak Akses Istimewa?"
        message={
          <>
            Anda akan membuat akun dengan role <strong className="text-rose-400 uppercase font-bold">{formData.role}</strong> untuk email <strong className="text-white">{formData.email}</strong>.
            <br />
            Akun ini akan memiliki hak akses ke panel pengelolaan sistem.
          </>
        }
        confirmText="Ya, Buat Akun"
        cancelText="Batal"
        variant="warning"
        isLoading={confirmCreate.isLoading}
      />

      {/* Confirmation Modal - Regenerate API Key */}
      <ConfirmModal
        isOpen={confirmRegenerateKey}
        onClose={() => setConfirmRegenerateKey(false)}
        onConfirm={handleGenerateApiKey}
        title="Buat Ulang API Key (Regenerate)?"
        message={
          <>
            Anda akan membuat API Key baru untuk akun{" "}
            <strong className="text-white">{selectedUser?.name}</strong>.
            <br />
            <span className="text-rose-400 font-semibold block mt-1">
              Peringatan: API Key lama akan langsung dinonaktifkan dan koneksi H2H mitra dengan key lama akan terputus.
            </span>
          </>
        }
        confirmText="Ya, Buat Ulang API Key"
        cancelText="Batal"
        variant="warning"
        isLoading={isGeneratingKey}
      />

      {/* Modal 2FA Authenticator Verification */}
      {is2FAModalOpen && targetUserForEdit &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => {
              if (!twoFALoading) {
                setIs2FAModalOpen(false);
                setTwoFAError(null);
              }
            }}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Verifikasi Authenticator
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Keamanan Akses Edit Pengguna
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={twoFALoading}
                  onClick={() => {
                    setIs2FAModalOpen(false);
                    setTwoFAError(null);
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleVerify2FASubmit} className="space-y-4 text-xs">
                <div className="text-slate-300 text-xs">
                  Masukkan <span className="font-bold text-white">6 digit kode authenticator</span> (seperti saat login) untuk membuka modal edit pengguna{" "}
                  <span className="font-semibold text-indigo-400">{targetUserForEdit.name}</span>.
                </div>

                {twoFAError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                    {twoFAError}
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5 text-center">
                    Kode 6-Digit Authenticator (TOTP)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    required
                    maxLength={6}
                    value={twoFACode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setTwoFACode(val);
                      if (twoFAError) setTwoFAError(null);
                    }}
                    placeholder="000000"
                    className="w-full text-center tracking-[0.5em] font-mono text-xl py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={twoFALoading}
                    onClick={() => {
                      setIs2FAModalOpen(false);
                      setTwoFAError(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={twoFALoading || twoFACode.length !== 6}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-colors"
                  >
                    {twoFALoading ? "Memverifikasi..." : "Verifikasi & Buka"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
