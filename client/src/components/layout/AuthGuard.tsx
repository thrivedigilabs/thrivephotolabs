import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AuthModal } from '../modals/AuthModal';
import { sendEmailVerification, auth } from '../../lib/firebase';
import { AlertCircle, RefreshCcw } from 'lucide-react';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useAuth();
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-bg">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
                    <div className="absolute inset-0 w-16 h-16 border-4 border-accent rounded-full animate-pulse blur-md opacity-50" />
                </div>
            </div>
        );
    }

    if (!user) {
        return <AuthModal isOpen={true} onClose={() => { }} />;
    }

    const handleResend = async () => {
        if (!auth.currentUser) return;
        setResending(true);
        try {
            await sendEmailVerification(auth.currentUser);
            setResent(true);
            setTimeout(() => setResent(false), 5000);
        } catch (error) {
            console.error('Error resending verification email:', error);
        } finally {
            setResending(false);
        }
    };

    return (
        <>
            {!user.emailVerified && (
                <div className="sticky top-0 z-40 bg-accent text-white py-2 px-4 shadow-lg shadow-accent-glow/20">
                    <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <AlertCircle size={18} />
                            <span>Please verify your email to access all features.</span>
                        </div>
                        <button
                            onClick={handleResend}
                            disabled={resending || resent}
                            className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-md text-xs font-bold transition-all disabled:opacity-50"
                        >
                            {resending ? (
                                <RefreshCcw size={14} className="animate-spin" />
                            ) : resent ? (
                                'Email Sent!'
                            ) : (
                                'Resend Email'
                            )}
                        </button>
                    </div>
                </div>
            )}
            {children}
        </>
    );
};
