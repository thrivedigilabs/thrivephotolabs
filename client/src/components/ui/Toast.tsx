import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { useTabStore } from '../../store/tabStore';

const TOAST_ICONS = {
    success: <CheckCircle2 size={18} className="text-success" />,
    error: <AlertCircle size={18} className="text-danger" />,
    warning: <AlertTriangle size={18} className="text-warning" />,
    info: <Info size={18} className="text-accent" />,
};

const TOAST_STYLES = {
    success: 'border-success/20 bg-success/5 shadow-success/10',
    error: 'border-danger/20 bg-danger/5 shadow-danger/10',
    warning: 'border-warning/20 bg-warning/5 shadow-warning/10',
    info: 'border-accent/20 bg-accent/5 shadow-accent/10',
};

export const ToastContainer: React.FC = () => {
    const { toasts, hideToast } = useTabStore();

    return (
        <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 min-w-[320px] pointer-events-none">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 10, scale: 0.95 }}
                        className={`
                            pointer-events-auto flex items-center gap-3 p-4 rounded-2xl border backdrop-blur-md shadow-xl transition-all
                            ${TOAST_STYLES[toast.type]}
                        `}
                    >
                        <div className="flex-shrink-0">
                            {TOAST_ICONS[toast.type]}
                        </div>
                        <p className="text-sm font-bold text-text-primary flex-1">{toast.message}</p>
                        <button
                            onClick={() => hideToast(toast.id)}
                            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
