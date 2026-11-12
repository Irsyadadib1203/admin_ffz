"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Trash2,
  CheckCircle2,
  HelpCircle,
  X,
  Loader2,
} from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "primary" | "success";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const variantStyles = {
    danger: {
      iconBg: "bg-rose-500/10 border-rose-500/20 text-rose-400",
      buttonBg:
        "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 focus:ring-rose-500",
      icon: Trash2,
    },
    warning: {
      iconBg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
      buttonBg:
        "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30 focus:ring-amber-500",
      icon: AlertTriangle,
    },
    primary: {
      iconBg: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
      buttonBg:
        "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 focus:ring-indigo-500",
      icon: HelpCircle,
    },
    success: {
      iconBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      buttonBg:
        "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 focus:ring-emerald-500",
      icon: CheckCircle2,
    },
  };

  const style = variantStyles[variant] || variantStyles.primary;
  const IconComponent = style.icon;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 relative scale-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {!isLoading && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${style.iconBg}`}
          >
            <IconComponent className="w-5 h-5" />
          </div>

          <div className="space-y-1.5 pt-0.5 flex-1 pr-4">
            <h3 className="text-base font-bold text-white leading-tight">
              {title}
            </h3>
            <div className="text-xs text-slate-300 leading-relaxed">
              {message}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-semibold transition-colors"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-5 py-2 rounded-xl text-xs font-bold shadow-lg transition-all flex items-center gap-2 ${style.buttonBg} disabled:opacity-50`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
