"use client";

import React from "react";
import { X, AlertTriangle, ShieldAlert, Ban, Trash2, CheckCircle2 } from "lucide-react";

interface ActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText: string;
    type: "danger" | "warning" | "success";
    icon?: React.ElementType;
}

export default function UserActionModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText,
    type = "warning",
    icon: Icon
}: ActionModalProps) {
    if (!isOpen) return null;

    const colors = {
        danger: {
            bg: "bg-red-500/10",
            border: "border-red-500/20",
            text: "text-red-400",
            button: "bg-red-600 hover:bg-red-500 shadow-red-500/20",
            icon: Trash2
        },
        warning: {
            bg: "bg-yellow-500/10",
            border: "border-yellow-500/20",
            text: "text-yellow-400",
            button: "bg-yellow-600 hover:bg-yellow-500 shadow-yellow-500/20",
            icon: Ban
        },
        success: {
            bg: "bg-green-500/10",
            border: "border-green-500/20",
            text: "text-green-400",
            button: "bg-green-600 hover:bg-green-500 shadow-green-500/20",
            icon: CheckCircle2
        }
    };

    const style = colors[type];
    const DisplayIcon = Icon || style.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1a0b2e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8 flex flex-col items-center text-center">
                    <div className={`w-16 h-16 rounded-full ${style.bg} border ${style.border} flex items-center justify-center mb-6`}>
                        <DisplayIcon className={`w-8 h-8 ${style.text}`} />
                    </div>

                    <h2 className="text-2xl font-bold mb-2">{title}</h2>
                    <p className="text-gray-400 mb-8">{description}</p>

                    <div className="flex w-full gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/5"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 px-4 py-3 rounded-xl text-white font-bold shadow-lg transition-all ${style.button}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
