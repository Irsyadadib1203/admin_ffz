"use client";

import { useState } from "react";
import useSWR from "swr";
import { Wallet, CheckCircle2, XCircle, Clock, Search, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";
import PromptModal from "@/components/PromptModal";
import Pagination from "@/components/Pagination";

const paginatedFetcher = (url: string) => api.get(url).then((res) => res.data);

export default function DepositsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Confirmation states
  const [approveModal, setApproveModal] = useState<{
    isOpen: boolean;
    depositId: number | null;
    userName: string;
    amount: number;
    isLoading: boolean;
  }>({
    isOpen: false,
    depositId: null,
    userName: "",
    amount: 0,
    isLoading: false,
  });

  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    depositId: number | null;
    userName: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    depositId: null,
    userName: "",
    isLoading: false,
  });

  const { data: resData, mutate, isLoading } = useSWR(
    `/admin/deposits?page=${page}&limit=${limit}&status=${statusFilter}`,
    paginatedFetcher
  );

  const deposits = Array.isArray(resData?.data) ? resData.data : [];
  const totalItems = resData?.meta?.total ?? deposits.length;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleApprovePrompt = (dep: any) => {
    setApproveModal({
      isOpen: true,
      depositId: dep.id,
      userName: dep.user?.name || `User #${dep.user_id}`,
      amount: dep.amount,
      isLoading: false,
    });
  };

  const executeApprove = async () => {
    if (!approveModal.depositId) return;
    setApproveModal((prev) => ({ ...prev, isLoading: true }));
    try {
      await api.post(`/admin/deposits/${approveModal.depositId}/approve`);
      setApproveModal({ isOpen: false, depositId: null, userName: "", amount: 0, isLoading: false });
      mutate();
    } catch (err: any) {
      setApproveModal((prev) => ({ ...prev, isLoading: false }));
      alert("Gagal menyetujui deposit: " + (err.response?.data?.message || err.message));
    }
  };

  const handleRejectPrompt = (dep: any) => {
    setRejectModal({
      isOpen: true,
      depositId: dep.id,
      userName: dep.user?.name || `User #${dep.user_id}`,
      isLoading: false,
    });
  };

  const executeReject = async (values: Record<string, string>) => {
    if (!rejectModal.depositId) return;
    setRejectModal((prev) => ({ ...prev, isLoading: true }));
    try {
      await api.post(`/admin/deposits/${rejectModal.depositId}/reject`, {
        notes: values.notes || "Bukti transfer tidak valid",
      });
      setRejectModal({ isOpen: false, depositId: null, userName: "", isLoading: false });
      mutate();
    } catch (err: any) {
      setRejectModal((prev) => ({ ...prev, isLoading: false }));
      alert("Gagal menolak deposit: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Persetujuan Deposit Saldo</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Verifikasi dan setujui penambahan saldo member & reseller
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu Persetujuan (Pending)</option>
            <option value="approved">Disetujui (Approved)</option>
            <option value="rejected">Ditolak (Rejected)</option>
          </select>

          <button
            onClick={() => mutate()}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Deposits Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
              <th className="py-3.5 px-5">Invoice & Waktu</th>
              <th className="py-3.5 px-4">Member / Reseller</th>
              <th className="py-3.5 px-4">Nominal Deposit</th>
              <th className="py-3.5 px-4">Kode Unik</th>
              <th className="py-3.5 px-4">Total Transfer</th>
              <th className="py-3.5 px-4">Metode</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {deposits && deposits.length > 0 ? (
              deposits.map((dep: any) => (
                <tr key={dep.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-3.5 px-5">
                    <div>
                      <span className="font-mono font-bold text-slate-200 block">
                        {dep.invoice_number}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(dep.created_at).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div>
                      <span className="font-semibold text-white block">
                        {dep.user?.name || "User #" + dep.user_id}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {dep.user?.email}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-200">
                    {formatRupiah(dep.amount)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-amber-400 font-bold">
                    +{dep.unique_code || 0}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-400">
                    {formatRupiah(dep.total_amount)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    <div>
                      <span className="font-semibold block text-slate-200">{dep.payment_method}</span>
                      {dep.payment_type === "instant" ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold inline-block mt-0.5">
                          ⚡ Tripay Instan
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold inline-block mt-0.5">
                           Manual Bank
                        </span>
                      )}
                      {dep.tripay_reference && (
                        <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                          Ref: {dep.tripay_reference}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                        dep.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : dep.status === "pending"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {dep.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    {dep.status === "pending" ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprovePrompt(dep)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow transition-colors inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Setujui
                        </button>
                        <button
                          onClick={() => handleRejectPrompt(dep)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 font-semibold text-[11px] transition-colors inline-flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" /> Tolak
                        </button>
                      </div>
                    ) : dep.payment_type === "instant" ? (
                      <span className="text-sky-400 text-[11px] font-mono">Otomatis Terverifikasi</span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Selesai</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500">
                  {isLoading ? "Memuat permintaan deposit..." : "Tidak ada deposit."}
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

      {/* Confirmation Modal - Approve Deposit */}
      <ConfirmModal
        isOpen={approveModal.isOpen}
        onClose={() =>
          setApproveModal({ isOpen: false, depositId: null, userName: "", amount: 0, isLoading: false })
        }
        onConfirm={executeApprove}
        title="Setujui Permintaan Deposit?"
        message={
          <>
            Apakah Anda yakin ingin menyetujui deposit sebesar{" "}
            <strong className="text-emerald-400 font-bold">{formatRupiah(approveModal.amount)}</strong> untuk{" "}
            <strong className="text-white font-semibold">{approveModal.userName}</strong>?
            <br />
            <span className="text-slate-400 text-[11px] mt-1 block">
              Saldo akun pengguna akan langsung ditambahkan secara otomatis oleh sistem.
            </span>
          </>
        }
        confirmText="Ya, Setujui & Tambah Saldo"
        cancelText="Batal"
        variant="success"
        isLoading={approveModal.isLoading}
      />

      {/* Prompt Modal - Reject Deposit */}
      <PromptModal
        isOpen={rejectModal.isOpen}
        onClose={() =>
          setRejectModal({ isOpen: false, depositId: null, userName: "", isLoading: false })
        }
        onSubmit={executeReject}
        title="Tolak Permintaan Deposit"
        description={`Masukkan alasan penolakan deposit untuk ${rejectModal.userName}`}
        fields={[
          {
            name: "notes",
            label: "Alasan Penolakan",
            placeholder: "Contoh: Bukti transfer tidak valid / dana belum masuk ke rekening",
            defaultValue: "Bukti transfer tidak valid",
            required: true,
          },
        ]}
        confirmText="Tolak Deposit"
        cancelText="Batal"
        variant="danger"
        isLoading={rejectModal.isLoading}
      />
    </div>
  );
}
