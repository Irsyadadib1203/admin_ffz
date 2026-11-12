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

  const openEditModal = (user: any) => {
    setSelectedUser(user);
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
            Kelola peran hak akses (Admin/Operator), Tier Harga (VIP/Reseller), dan Saldo
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
              <th className="py-3.5 px-4">Tier Harga</th>
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
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-indigo-300 uppercase">
                      {u.tier}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-emerald-400">
                    {formatRupiah(u.balance)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px]">
                    {u.api_key ? (
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(u.api_key.key)}
                        title="Salin API key"
                        className="inline-flex items-center gap-1 text-amber-400 font-semibold hover:text-amber-300"
                      >
                        {u.api_key.key}<Copy className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Edit User & Saldo"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500">
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

                <div className="grid grid-cols-2 gap-3">
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

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Tier Harga
                    </label>
                    <select
                      value={formData.tier}
                      onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none"
                    >
                      <option value="public">Publik</option>
                      <option value="member">Member</option>
                      <option value="vip">VIP</option>
                      <option value="reseller">Reseller H2H</option>
                    </select>
                  </div>
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

                <div className="grid grid-cols-2 gap-3">
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

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Tier Harga
                    </label>
                    <select
                      value={formData.tier}
                      onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none"
                    >
                      <option value="public">Publik</option>
                      <option value="member">Member</option>
                      <option value="vip">VIP</option>
                      <option value="reseller">Reseller H2H</option>
                    </select>
                  </div>
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
              <li>• Tier: <span className="font-semibold text-indigo-300 uppercase">{formData.tier}</span></li>
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
    </div>
  );
}
