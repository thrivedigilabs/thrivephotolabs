import React, { useState } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    auth
} from '../../lib/firebase';
import { Mail, Lock, Eye, EyeOff, X } from 'lucide-react';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                onClose();
            } else {
                if (password !== confirmPassword) {
                    throw new Error('Passwords do not match');
                }
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await sendEmailVerification(userCredential.user);
                setSuccess('Check your inbox to verify your email before logging in.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md bg-bg-card border border-bg-border rounded-2xl shadow-2xl overflow-hidden">

                <div className="p-8">
                    <h2 className="text-2xl font-bold mb-6 text-center">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>

                    <div className="flex bg-bg rounded-lg p-1 mb-8">
                        <button
                            className={`flex-1 py-2 rounded-md transition-all ${isLogin ? 'bg-bg-border text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                            onClick={() => setIsLogin(true)}
                        >
                            Login
                        </button>
                        <button
                            className={`flex-1 py-2 rounded-md transition-all ${!isLogin ? 'bg-bg-border text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                            onClick={() => setIsLogin(false)}
                        >
                            Register
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Email Address</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                                    <Mail size={18} />
                                </span>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-bg border border-bg-border rounded-xl py-2.5 pl-10 pr-4 text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all placeholder:text-text-muted"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Password</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                                    <Lock size={18} />
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-bg border border-bg-border rounded-xl py-2.5 pl-10 pr-12 text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all placeholder:text-text-muted"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Confirm Password</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                                        <Lock size={18} />
                                    </span>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-bg border border-bg-border rounded-xl py-2.5 pl-10 pr-4 text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all placeholder:text-text-muted"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-3 bg-success/10 border border-success/20 rounded-xl text-success text-sm">
                                {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl shadow-lg shadow-accent-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                    Processing...
                                </div>
                            ) : (
                                isLogin ? 'Sign In' : 'Create Account'
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-text-secondary">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-accent hover:text-accent-hover font-medium underline underline-offset-4"
                        >
                            {isLogin ? 'Sign up' : 'Sign in'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};
