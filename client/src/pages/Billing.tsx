import React, { useState, useEffect } from 'react';
import {
    CreditCard,
    Check,
    ArrowUpCircle,
    Zap,
    ShieldCheck,
    Rocket,
    BarChart3,
    ArrowRight,
    RefreshCcw,
    XCircle,
    Coins,
    History,
    AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useTabStore } from '../store/tabStore';
import apiClient from '../lib/apiClient';
import { PLAN_LIMITS, Plan, CREDIT_PACKS_BY_PLAN, CreditPack } from '../types';
import { openRazorpayCheckout } from '../lib/razorpay';
import { auth } from '../lib/firebase';

const PLANS: Array<{ id: Plan; name: string; price: string; features: string[] }> = [
    {
        id: 'free',
        name: 'Free',
        price: '₹0',
        features: ['50 Images/mo', '3 AI Batches', 'Google Drive Sync']
    },
    {
        id: 'creator',
        name: 'Creator',
        price: '₹999',
        features: ['500 Images/mo', '20 AI Batches', 'Drive Sync', 'Shopify Push']
    },
    {
        id: 'studio',
        name: 'Studio',
        price: '₹2,999',
        features: ['2,000 Images/mo', '100 AI Batches', 'All Features', 'Priority Support']
    },
    {
        id: 'agency',
        name: 'Agency',
        price: '₹7,999',
        features: ['10,000 Images/mo', '999 AI Batches', 'Unlimited Everything', 'Dedicated Manager']
    },
];

export const Billing: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const { showToast } = useTabStore();
    const [usage, setUsage] = useState({ imagesProcessed: 0, aiBatchesUsed: 0, extraCredits: 0 });
    const [billingStatus, setBillingStatus] = useState<any>(null);
    const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const [usageRes, statusRes] = await Promise.all([
                apiClient.get('/api/usage/me'),
                apiClient.get('/api/razorpay/billing-status')
            ]);
            setUsage(usageRes.data);
            setBillingStatus(statusRes.data);
        } catch (err) {
            console.error('Failed to fetch billing data');
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpgrade = async (plan: Plan) => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            showToast('Please log in again before making a payment.', 'error');
            return;
        }

        // Verify token works before calling API
        try {
            const token = await currentUser.getIdToken(false);
            if (!token) throw new Error('Empty token');
            console.log('[Billing] Token ready, length:', token.length);
        } catch (tokenErr) {
            showToast('Session expired. Please log out and log in again.', 'error');
            return;
        }

        setUpgradeLoading(plan);
        try {
            const response = await apiClient.post('/api/razorpay/create-order', { plan });
            const { orderId, amount, currency, keyId } = response.data;

            if (!keyId) {
                showToast('Payment config missing. Check server env vars.', 'error');
                return;
            }

            if (!orderId) {
                showToast('No order ID returned from server.', 'error');
                return;
            }

            await openRazorpayCheckout({
                keyId,
                orderId,
                amount: Number(amount),
                currency: currency || 'INR',
                name: 'ThrivePhotoLabs',
                description: `Upgrade to ${PLAN_LIMITS[plan].label} Plan`,
                email: user?.email || '',
                onSuccess: async (rzpResponse) => {
                    try {
                        const verifyRes = await apiClient.post('/api/razorpay/verify-payment', {
                            orderId,
                            paymentId: rzpResponse.razorpay_payment_id,
                            signature: rzpResponse.razorpay_signature,
                            plan
                        });
                        if (verifyRes.data.success) {
                            showToast(`Success! You are now on the ${PLAN_LIMITS[plan].label} plan.`, 'success');
                            await refreshUser();
                            await fetchData();
                        }
                    } catch (verifyErr: any) {
                        showToast('Payment verified but failed to update status. Contact support.', 'error');
                    }
                },
                onFailure: (error) => {
                    if (error?.reason !== 'dismissed') {
                        console.error('Razorpay payment failed:', error);
                        showToast(`Payment failed: ${error?.description || 'Unknown error'}`, 'error');
                    }
                },
            });
        } catch (err: any) {
            console.error('Upgrade error:', err);
            const serverError = err.response?.data?.error || err.response?.data?.details || err.message;
            showToast(`Failed: ${serverError}`, 'error');
        } finally {
            setUpgradeLoading(null);
        }
    };

    const handleDowngrade = async (targetPlan: Plan) => {
        const confirmed = window.confirm(
            `Downgrade to ${PLAN_LIMITS[targetPlan].label} plan?\n\nYou'll keep your current plan benefits until the end of your billing cycle.`
        );
        if (!confirmed) return;

        try {
            const res = await apiClient.post('/api/razorpay/request-downgrade', { targetPlan });
            showToast(res.data.message, 'success');
            await fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Failed to schedule downgrade', 'error');
        }
    };

    const handleCancelDowngrade = async () => {
        try {
            const res = await apiClient.post('/api/razorpay/cancel-downgrade');
            showToast(res.data.message, 'success');
            await fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Failed to cancel downgrade', 'error');
        }
    };

    const handleTopup = async (pack: CreditPack) => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            showToast('Please log in again before making a payment.', 'error');
            return;
        }

        // Verify token works before calling API
        try {
            const token = await currentUser.getIdToken(false);
            if (!token) throw new Error('Empty token');
            console.log('[Billing] Token ready, length:', token.length);
        } catch (tokenErr) {
            showToast('Session expired. Please log out and log in again.', 'error');
            return;
        }

        setUpgradeLoading(pack.id);
        try {
            const response = await apiClient.post('/api/razorpay/create-topup-order', {
                packId: pack.id,
            });

            const { orderId, amount, currency, keyId } = response.data;

            if (!keyId) {
                showToast('Payment config missing. Check server env vars.', 'error');
                return;
            }

            if (!orderId) {
                showToast('No order ID returned from server.', 'error');
                return;
            }

            await openRazorpayCheckout({
                keyId,
                orderId,
                amount: Number(amount),
                currency: currency || 'INR',
                name: 'ThrivePhotoLabs',
                description: `Credit Pack: ${pack.label}`,
                email: user?.email || '',
                onSuccess: async (rzpResponse) => {
                    try {
                        const verifyRes = await apiClient.post('/api/razorpay/verify-topup', {
                            orderId,
                            paymentId: rzpResponse.razorpay_payment_id,
                            signature: rzpResponse.razorpay_signature,
                            packId: pack.id,
                        });
                        if (verifyRes.data.success) {
                            showToast(`✅ ${pack.images} credits added to your account!`, 'success');
                            await fetchData();
                        }
                    } catch (verifyErr: any) {
                        showToast('Payment verified but failed to add credits. Contact support.', 'error');
                    }
                },
                onFailure: (error) => {
                    if (error?.reason !== 'dismissed') {
                        console.error('Razorpay payment failed:', error);
                        showToast(`Payment failed: ${error?.description || 'Unknown error'}`, 'error');
                    }
                },
            });
        } catch (err: any) {
            console.error('Topup error:', err);
            const serverError = err.response?.data?.error || err.response?.data?.details || err.message;
            showToast(`Failed: ${serverError}`, 'error');
        } finally {
            setUpgradeLoading(null);
        }
    };

    const getPlanAction = (planKey: Plan) => {
        const PLAN_ORDER: Record<string, number> = { free: 0, creator: 1, studio: 2, agency: 3 };
        const currentRank = PLAN_ORDER[user?.plan || 'free'];
        const targetRank = PLAN_ORDER[planKey];

        if (planKey === user?.plan) {
            return (
                <button disabled className="w-full py-4 rounded-xl bg-success/10 text-success text-sm font-bold cursor-default">
                    ✓ Current Plan
                </button>
            );
        }

        if (targetRank > currentRank) {
            return (
                <button
                    onClick={() => handleUpgrade(planKey)}
                    disabled={!!upgradeLoading}
                    className="w-full py-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-bold shadow-lg shadow-accent-glow transition-all disabled:opacity-50"
                >
                    {upgradeLoading === planKey ? <RefreshCcw className="animate-spin mx-auto" size={20} /> : `Upgrade to ${PLAN_LIMITS[planKey].label}`}
                </button>
            );
        }

        const isPendingDowngrade = billingStatus?.cycle?.pendingDowngrade === planKey;
        return (
            <button
                onClick={() => !isPendingDowngrade && handleDowngrade(planKey)}
                disabled={isPendingDowngrade || !!upgradeLoading}
                className={`w-full py-4 rounded-xl text-sm font-bold transition-all border ${isPendingDowngrade
                    ? 'border-warning/50 text-warning cursor-not-allowed opacity-70'
                    : 'border-danger/50 text-danger hover:bg-danger/10'
                    }`}
            >
                {isPendingDowngrade ? '⏳ Downgrade Scheduled' : `Downgrade to ${PLAN_LIMITS[planKey].label}`}
            </button>
        );
    };

    const currentPlanLimit = user ? PLAN_LIMITS[user.plan] : PLAN_LIMITS.free;
    const totalImagesAllowed = currentPlanLimit.imagesPerMonth + (usage.extraCredits || 0);

    const imgPercent = Math.min(100, (usage.imagesProcessed / totalImagesAllowed) * 100);
    const aiPercent = Math.min(100, (usage.aiBatchesUsed / currentPlanLimit.aiBatchesPerMonth) * 100);

    return (
        <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
            {/* Billing Cycle Info Banner */}
            {user?.plan !== 'free' && billingStatus?.cycle && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-bg-card border border-bg-border rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between shadow-xl"
                >
                    <div className="flex items-center gap-4 text-center md:text-left">
                        <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                            <RefreshCcw size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-text-secondary">
                                Current billing cycle ends on{' '}
                                <span className="text-white font-bold">
                                    {billingStatus.cycle.renewsAtFormatted}
                                </span>
                            </p>
                            {billingStatus.cycle.pendingDowngrade && (
                                <p className="text-xs text-warning mt-1 font-medium flex items-center gap-1">
                                    <AlertCircle size={14} />
                                    Scheduled to downgrade to{' '}
                                    <span className="capitalize">{billingStatus.cycle.pendingDowngrade}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    {billingStatus.cycle.pendingDowngrade && (
                        <button
                            onClick={handleCancelDowngrade}
                            className="mt-4 md:mt-0 px-6 py-2 rounded-xl border border-accent text-accent hover:bg-accent/10 font-bold text-sm transition-all"
                        >
                            Cancel Downgrade
                        </button>
                    )}
                </motion.div>
            )}

            {import.meta.env.DEV && (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={async () => {
                            try {
                                const res = await apiClient.post('/api/razorpay/debug-auth', {});
                                console.log('DEBUG AUTH RESULT:', res.data);
                                alert(JSON.stringify(res.data, null, 2));
                            } catch (err: any) {
                                console.error('Debug auth error:', err.response?.data);
                                alert('Error: ' + JSON.stringify(err.response?.data));
                            }
                        }}
                        className="text-xs px-3 py-1 bg-warning/20 text-warning rounded-lg border border-warning/30 hover:bg-warning/30 transition-all font-bold"
                    >
                        Debug Auth Token
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                const res = await apiClient.post('/api/razorpay/test-order', {});
                                alert(JSON.stringify(res.data, null, 2));
                            } catch (e: any) {
                                alert('ERROR: ' + JSON.stringify(e.response?.data, null, 2));
                            }
                        }}
                        className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 transition-all font-bold hover:bg-blue-500/30"
                    >
                        🧪 Test Razorpay
                    </button>
                </div>
            )}

            {/* Current Plan & Usage Summary */}
            <section className="bg-bg-card border border-bg-border rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <BarChart3 size={160} />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-xs font-bold uppercase tracking-widest text-accent">
                            <Zap size={14} />
                            Your Current Plan
                        </div>
                        <h1 className="text-4xl font-extrabold text-text-primary capitalize">{user?.plan} Membership</h1>
                        <p className="text-text-secondary max-w-md">Your subscription resets on the 1st of every month. Upgrade any time to increase your limits.</p>
                    </div>

                    <div className="w-full md:w-80 space-y-6 bg-bg/50 p-6 rounded-2xl border border-bg-border shadow-inner">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                <span className="text-text-secondary">Image Optimization</span>
                                <span className="text-text-primary">{usage.imagesProcessed} / {totalImagesAllowed}</span>
                            </div>
                            <div className="h-2 w-full bg-bg-border rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-accent"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${imgPercent}%` }}
                                    transition={{ duration: 1 }}
                                />
                            </div>
                            {usage.extraCredits > 0 && (
                                <p className="text-[10px] text-success font-bold uppercase text-right">Includes {usage.extraCredits} extra credits</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                <span className="text-text-secondary">AI Smart Batching</span>
                                <span className="text-text-primary">{usage.aiBatchesUsed} / {currentPlanLimit.aiBatchesPerMonth}</span>
                            </div>
                            <div className="h-2 w-full bg-bg-border rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-success"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${aiPercent}%` }}
                                    transition={{ duration: 1 }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Extra Credits Topup */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
                        <Coins size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-text-primary">Need more images?</h2>
                        <p className="text-xs text-text-muted">Top up your account with one-time image credits. These credits do not expire this month.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {user && CREDIT_PACKS_BY_PLAN[user.plan]?.map((pack) => (
                        <div key={pack.id} className="bg-bg-card border border-bg-border rounded-2xl p-6 flex flex-col justify-between hover:border-accent/40 transition-all group shadow-lg">
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-text-primary">{pack.label}</h3>
                                <p className="text-sm text-text-muted">High-quality optimization credits.</p>
                                <div className="pt-2 text-2xl font-black text-white">₹{pack.priceINR}</div>
                            </div>
                            <button
                                onClick={() => handleTopup(pack)}
                                disabled={!!upgradeLoading}
                                className="mt-6 w-full py-3 bg-bg border border-bg-border hover:border-accent hover:text-accent rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                            >
                                {upgradeLoading === pack.id ? <RefreshCcw className="animate-spin mx-auto" size={18} /> : 'Purchase Pack'}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Plan Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {PLANS.map((plan) => {
                    const isCurrent = user?.plan === plan.id;
                    return (
                        <div
                            key={plan.id}
                            className={`
                                relative flex flex-col p-8 rounded-3xl border transition-all duration-300
                                ${isCurrent ? 'bg-accent/5 border-accent shadow-lg shadow-accent/5 scale-105 z-10' : 'bg-bg-card border-bg-border hover:border-accent/40'}
                            `}
                        >
                            {isCurrent && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg">
                                    Active Plan
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-xl font-extrabold text-text-primary">{plan.name}</h3>
                                <div className="mt-4 flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-text-primary">{plan.price}</span>
                                    <span className="text-text-muted text-sm font-bold">/mo</span>
                                </div>
                            </div>

                            <ul className="flex-1 space-y-4 mb-10">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                                        <div className="mt-0.5 w-5 h-5 rounded-full bg-success/10 flex items-center justify-center text-success flex-shrink-0">
                                            <Check size={12} />
                                        </div>
                                        <span className="font-medium">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {getPlanAction(plan.id)}
                        </div>
                    );
                })}
            </div>

            {/* Footer / Trust badges */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-12 pt-10 opacity-50">
                <div className="flex items-center gap-3">
                    <ShieldCheck size={24} className="text-accent" />
                    <span className="text-sm font-bold uppercase tracking-widest">Secure Payments</span>
                </div>
                <div className="flex items-center gap-3">
                    <RefreshCcw size={24} className="text-success" />
                    <span className="text-sm font-bold uppercase tracking-widest">Instant Activation</span>
                </div>
                {user?.plan !== 'free' && (
                    <div className="flex items-center gap-3 text-text-muted hover:text-danger transition-colors cursor-pointer" onClick={() => handleDowngrade('free')}>
                        <XCircle size={18} />
                        <span className="text-xs font-bold leading-none">Cancel Subscription</span>
                    </div>
                )}
            </div>
        </div>
    );
};
export default Billing;
