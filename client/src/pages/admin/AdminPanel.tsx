import React, { useState, useEffect, useCallback } from 'react';
import {
    Users,
    TrendingUp,
    BarChart2,
    UserPlus,
    Search,
    ChevronLeft,
    ChevronRight,
    RefreshCcw,
    Trash2,
    Shield,
    Mail,
    Calendar,
    Activity,
    Zap,
    History,
    Eye,
    FileText,
    CalendarDays,
    Clock,
    ArrowDownCircle,
    AlertCircle,
    Download,
    Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../lib/apiClient';
import { useTabStore } from '../../store/tabStore';
import { Plan } from '../../types';

interface User {
    uid: string;
    email: string;
    plan: Plan;
    created_at: number;
    images_processed: number;
    images_downloaded: number;
    ai_batches_used: number;
    extra_credits: number;
    cycleStarted?: number;
    cycleRenews?: number;
    pendingDowngrade?: string;
}

interface DownloadLog {
    filename: string;
    original_size: number;
    final_size: number;
    downloaded_at: number;
    session_id: string;
}

interface Stats {
    totalUsers: number;
    usersByPlan: Record<Plan, number>;
    totalImagesThisMonth: number;
    totalAIBatchesThisMonth: number;
    newUsersThisWeek: number;
}

const isExpiringSoon = (renewsAt: number): boolean => {
    const daysLeft = Math.ceil((renewsAt * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 5;
};

export const AdminPanel: React.FC = () => {
    const { showToast } = useTabStore();
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [history, setHistory] = useState<DownloadLog[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const fetchStats = async () => {
        try {
            const { data } = await apiClient.get('/api/admin/stats');
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch stats');
        }
    };

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await apiClient.get(`/api/admin/users?page=${page}&search=${search}`);
            setUsers(data.users);
            setTotalPages(data.totalPages);
        } catch (err) {
            console.error('Failed to fetch users');
        } finally {
            setIsLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchUsers();
        }, 300);
        return () => clearTimeout(handler);
    }, [fetchUsers]);

    const handlePlanChange = async (uid: string, newPlan: Plan) => {
        try {
            await apiClient.patch(`/api/admin/users/${uid}/plan`, { plan: newPlan });
            showToast(`Plan updated for user`, 'success');
            fetchUsers();
            fetchStats();
        } catch (err) {
            showToast('Failed to update plan', 'error');
        }
    };

    const handleCreateCycle = async (uid: string) => {
        try {
            await apiClient.post(`/api/admin/users/${uid}/create-cycle`);
            showToast('Billing cycle created (30 days from today)', 'success');
            fetchUsers();
        } catch (err: any) {
            showToast('Failed to create cycle', 'error');
        }
    };

    const handleResetUsage = async (uid: string) => {
        if (!confirm('Reset current month usage for this user?')) return;
        try {
            await apiClient.post(`/api/admin/users/${uid}/reset-usage`);
            showToast('Usage reset successful', 'success');
            fetchUsers();
        } catch (err) {
            showToast('Failed to reset usage', 'error');
        }
    };

    const fetchDownloadHistory = async (user: User) => {
        setSelectedUser(user);
        setHistory([]);
        setIsHistoryLoading(true);
        try {
            const { data } = await apiClient.get(`/api/admin/users/${user.uid}/download-history`);
            setHistory(data.logs);
        } catch (err) {
            showToast('Failed to fetch history', 'error');
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleDeleteUser = async (uid: string) => {
        if (!confirm('PERMANENTLY DELETE this user and all their data? This cannot be undone.')) return;
        try {
            await apiClient.delete(`/api/admin/users/${uid}`);
            showToast('User deleted permanently', 'info');
            fetchUsers();
            fetchStats();
        } catch (err) {
            showToast('Failed to delete user', 'error');
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Users"
                    value={stats?.totalUsers || 0}
                    icon={<Users size={20} />}
                    color="text-accent"
                />
                <div className="bg-bg-card border border-bg-border rounded-xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Plan Distribution</span>
                        <TrendingUp size={16} className="text-success" />
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-bg-border">
                        {stats && Object.entries(stats.usersByPlan).map(([plan, count]) => (
                            <div
                                key={plan}
                                style={{ width: `${(count / stats.totalUsers) * 100}%` }}
                                className={`h-full ${plan === 'free' ? 'bg-text-muted' :
                                    plan === 'creator' ? 'bg-accent' :
                                        plan === 'studio' ? 'bg-success' : 'bg-warning'
                                    }`}
                                title={`${plan}: ${count}`}
                            />
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-text-muted uppercase">
                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-text-muted" /> Free</span>
                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> Creator</span>
                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-success" /> Studio</span>
                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-warning" /> Agency</span>
                    </div>
                </div>
                <StatCard
                    title="Processed Monthly"
                    value={stats?.totalImagesThisMonth.toLocaleString() || 0}
                    subValue="Images"
                    icon={<BarChart2 size={20} />}
                    color="text-success"
                />

                {/* Expiring This Week Card */}
                {(() => {
                    const expiringCount = users.filter((u: any) => {
                        if (!u.cycleRenews) return false;
                        const daysLeft = Math.ceil((u.cycleRenews * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
                        return daysLeft >= 0 && daysLeft <= 7;
                    }).length;

                    return (
                        <div className="bg-bg-card border border-bg-border rounded-xl p-5 group hover:border-accent transition-all shadow-sm">
                            <div className="flex items-center justify-between mb-3 text-warning">
                                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Expiring Soon</span>
                                <AlertCircle size={16} />
                            </div>
                            <div className="text-3xl font-bold text-warning">{expiringCount}</div>
                            <div className="text-[10px] font-bold text-text-muted uppercase mt-1 tracking-wider">plans renewing in 7 days</div>
                        </div>
                    );
                })()}
            </div>

            {/* Users Management */}
            <section className="bg-bg-card border border-bg-border rounded-3xl shadow-xl overflow-hidden">
                <div className="p-6 border-b border-bg-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">User Management</h2>
                            <p className="text-xs text-text-muted">Monitor and manage platform access and subscriptions.</p>
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                        <input
                            type="text"
                            placeholder="Search by email..."
                            className="bg-bg border border-bg-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-accent outline-none w-full md:w-80 transition-all shadow-inner"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-bg/20 text-[11px] font-black text-text-muted uppercase tracking-widest border-b border-bg-border">
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Plan</th>
                                <th className="px-6 py-4">Monthly Usage</th>
                                <th className="px-6 py-4">Billing</th>
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-bg-border/50">
                            <AnimatePresence mode="wait">
                                {isLoading ? (
                                    <tr key="loading">
                                        <td colSpan={6} className="py-20 text-center">
                                            <RefreshCcw className="animate-spin text-accent mx-auto mb-2" size={32} />
                                            <p className="text-sm font-bold text-text-muted uppercase tracking-widest">Loading Users...</p>
                                        </td>
                                    </tr>
                                ) : users.map((user, idx) => (
                                    <motion.tr
                                        key={user.uid}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="hover:bg-accent/[0.02] bg-[#16161D] even:bg-[#12121A] transition-colors group"
                                    >
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-bg-border flex items-center justify-center text-text-muted group-hover:text-accent group-hover:bg-accent/10 transition-all">
                                                    <Mail size={16} />
                                                </div>
                                                <span className="text-sm font-bold truncate max-w-[200px]">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <select
                                                className={`
                                                    bg-bg/50 border border-bg-border rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wider outline-none focus:border-accent
                                                    ${user.plan === 'free' ? 'text-text-muted' :
                                                        user.plan === 'creator' ? 'text-accent border-accent/20' :
                                                            user.plan === 'studio' ? 'text-success border-success/20' : 'text-warning border-warning/20'}
                                                `}
                                                value={user.plan}
                                                onChange={(e) => handlePlanChange(user.uid, e.target.value as Plan)}
                                            >
                                                <option value="free">Free</option>
                                                <option value="creator">Creator</option>
                                                <option value="studio">Studio</option>
                                                <option value="agency">Agency</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1 text-[10px] font-bold text-text-secondary uppercase">
                                                <div className="flex items-center gap-2">
                                                    <Activity size={10} className="text-accent" />
                                                    <span>{user.images_processed || 0} Processed</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <FileText size={10} className="text-success" />
                                                    <span>{user.images_downloaded || 0} Saved</span>
                                                </div>
                                                {user.extra_credits > 0 && (
                                                    <div className="text-warning-hover font-black">+{user.extra_credits} Extra Credits</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {user.plan === 'free' ? (
                                                <span className="text-xs text-text-muted italic">No active plan</span>
                                            ) : user.cycleRenews ? (
                                                <div className="flex flex-col gap-1">
                                                    {/* Cycle dates */}
                                                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                                                        <CalendarDays size={11} className="text-accent shrink-0" />
                                                        <span className="whitespace-nowrap">
                                                            Started:{' '}
                                                            <span className="text-white">
                                                                {new Date(user.cycleStarted! * 1000).toLocaleDateString('en-IN', {
                                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                                })}
                                                            </span>
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                                                        <RefreshCcw size={11} className="text-success shrink-0" />
                                                        <span className="whitespace-nowrap">
                                                            Renews:{' '}
                                                            <span className={`font-medium ${isExpiringSoon(user.cycleRenews!) ? 'text-warning' : 'text-white'}`}>
                                                                {new Date(user.cycleRenews! * 1000).toLocaleDateString('en-IN', {
                                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                                })}
                                                            </span>
                                                        </span>
                                                    </div>

                                                    {/* Days remaining pill */}
                                                    <div className="mt-0.5">
                                                        {(() => {
                                                            const daysLeft = Math.ceil((user.cycleRenews! * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
                                                            const isExpired = daysLeft <= 0;
                                                            const isSoon = daysLeft <= 5 && !isExpired;
                                                            return (
                                                                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${isExpired ? 'bg-danger/15 text-danger' :
                                                                    isSoon ? 'bg-warning/15 text-warning' :
                                                                        'bg-success/10 text-success'
                                                                    }`}>
                                                                    <Clock size={9} />
                                                                    {isExpired ? 'Expired' : `${daysLeft}d left`}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>

                                                    {/* Pending downgrade warning */}
                                                    {user.pendingDowngrade && (
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-warning/15 text-warning font-medium capitalize">
                                                                <ArrowDownCircle size={9} />
                                                                → {user.pendingDowngrade} at renewal
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                // Paid plan but no billing_cycles record yet (manual upgrade by admin)
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-warning flex items-center gap-1">
                                                        <AlertCircle size={11} />
                                                        No cycle record
                                                    </span>
                                                    <button
                                                        onClick={() => handleCreateCycle(user.uid)}
                                                        className="text-[10px] text-accent font-bold hover:underline w-fit"
                                                    >
                                                        Create cycle
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-xs text-text-muted font-medium">
                                                <Calendar size={14} />
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => fetchDownloadHistory(user)}
                                                    className="p-2 text-text-muted hover:text-success hover:bg-success/10 rounded-lg transition-all"
                                                    title="View Download History"
                                                >
                                                    <History size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleResetUsage(user.uid)}
                                                    className="p-2 text-text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                                                    title="Reset Usage"
                                                >
                                                    <RefreshCcw size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.uid)}
                                                    className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-6 border-t border-bg-border flex items-center justify-between bg-bg/10">
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 rounded-lg border border-bg-border hover:border-accent hover:text-accent disabled:opacity-30 disabled:hover:border-bg-border transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 rounded-lg border border-bg-border hover:border-accent hover:text-accent disabled:opacity-30 disabled:hover:border-bg-border transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </section>

            {/* Download History Modal */}
            <AnimatePresence>
                {selectedUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-bg-card border border-bg-border rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-bg-border flex items-center justify-between bg-bg/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                                        <History size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-text-primary">Download Audit Log</h3>
                                        <p className="text-xs text-text-muted">{selectedUser.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="p-2 hover:bg-bg-border/50 rounded-xl transition-all"
                                >
                                    <Trash2 size={20} className="text-text-muted hover:text-danger" />
                                </button>
                            </div>

                            <div className="max-h-[60vh] overflow-y-auto p-4">
                                {isHistoryLoading ? (
                                    <div className="py-20 text-center">
                                        <RefreshCcw className="animate-spin text-success mx-auto mb-2" size={32} />
                                        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Fetching Audit Logs...</p>
                                    </div>
                                ) : history.length === 0 ? (
                                    <div className="py-20 text-center space-y-3">
                                        <div className="w-16 h-16 bg-bg-border/30 rounded-full flex items-center justify-center mx-auto text-text-muted opacity-50">
                                            <FileText size={32} />
                                        </div>
                                        <p className="text-text-muted font-medium">No download events found for this user.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-[10px] font-black text-text-muted uppercase tracking-widest border-b border-bg-border">
                                                <th className="px-4 py-2">Filename</th>
                                                <th className="px-4 py-2">Size (Orig → Final)</th>
                                                <th className="px-4 py-2">Time</th>
                                                <th className="px-4 py-2">Session ID</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-bg-border/30">
                                            {history.map((log, i) => (
                                                <tr key={i} className="text-xs hover:bg-bg/50 transition-colors">
                                                    <td className="px-4 py-3 font-bold text-text-primary truncate max-w-[150px]">{log.filename}</td>
                                                    <td className="px-4 py-3 text-text-muted">
                                                        {formatBytesHelper(log.original_size)} → <span className="text-success">{formatBytesHelper(log.final_size)}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-text-muted">
                                                        {new Date(log.downloaded_at * 1000).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-[10px] text-text-muted">{log.session_id || '--'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div className="p-4 border-t border-bg-border bg-bg/10 flex justify-end">
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="px-6 py-2 bg-bg border border-bg-border rounded-xl text-sm font-bold hover:border-text-muted transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const formatBytesHelper = (bytes: number): string => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const StatCard: React.FC<{ title: string; value: string | number; subValue?: string; icon: React.ReactNode; color: string }> = ({ title, value, subValue, icon, color }) => (
    <div className="bg-bg-card border border-bg-border rounded-xl p-5 shadow-sm space-y-3 group hover:border-accent transition-all">
        <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{title}</span>
            <div className={`${color} p-2 bg-current/10 rounded-lg`}>
                {icon}
            </div>
        </div>
        <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-text-primary">{value}</span>
            {subValue && <span className="text-[10px] font-bold text-text-muted uppercase">{subValue}</span>}
        </div>
    </div>
);
export default AdminPanel;
