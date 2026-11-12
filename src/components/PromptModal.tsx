"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export interface PromptField {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number";
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  rows?: number;
}

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
  title: string;
  description?: string;
  fields: PromptField[];
  confirmText?: string;
  cancelText?: string;
  variant?: "primary" | "warning" | "danger" | "success";
  isLoading?: boolean;
}

export default function PromptModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  fields,
  confirmText = "Simpan",
  cancelText = "Batal",
  variant = "primary",
  isLoading = false,
}: PromptModalProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const prevOpenRef = React.useRef(false);

  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      const initial: Record<string, string> = {};
      fields.forEach((f) => {
        initial[f.name] = f.defaultValue || "";
      });
      setFormValues(initial);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, fields]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formValues);
  };

  const variantStyles = {
    primary: {
      buttonBg:
        "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30",
      iconBg: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
      icon: HelpCircle,
    },
    warning: {
      buttonBg:
        "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30",
      iconBg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
      icon: AlertCircle,
    },
    danger: {
      buttonBg: "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30",
      iconBg: "bg-rose-500/10 border-rose-500/20 text-rose-400",
      icon: AlertCircle,
    },
    success: {
      buttonBg:
        "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30",
      iconBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
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
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 relative scale-100 animate-in zoom-in-95 duration-200"
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

        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${style.iconBg}`}
          >
            <IconComponent className="w-5 h-5" />
          </div>

          <div className="space-y-1 pt-0.5 flex-1 pr-4">
            <h3 className="text-base font-bold text-white leading-tight">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-slate-400">{description}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs pt-1">
          {fields.map((field) => (
            <div key={field.name} className="space-y-1">
              <label className="block text-slate-300 font-medium">
                {field.label} {field.required && <span className="text-rose-400">*</span>}
              </label>

              {field.type === "textarea" ? (
                <textarea
                  required={field.required}
                  rows={field.rows || 3}
                  placeholder={field.placeholder}
                  value={formValues[field.name] || ""}
                  onChange={(e) =>
                    setFormValues({ ...formValues, [field.name]: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-600 resize-none"
                />
              ) : (
                <input
                  type={field.type || "text"}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={formValues[field.name] || ""}
                  onChange={(e) =>
                    setFormValues({ ...formValues, [field.name]: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                />
              )}
            </div>
          ))}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-semibold transition-colors"
            >
              {cancelText}
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className={`px-5 py-2 rounded-xl text-xs font-bold shadow-lg transition-all flex items-center gap-2 ${style.buttonBg} disabled:opacity-50`}
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
