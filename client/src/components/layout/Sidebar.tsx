import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Zap,
    Layers,
    HardDrive,
    ShoppingBag,
    CreditCard,
    ShieldCheck,
    LogOut
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Zap, label: 'Optimize', path: '/optimize' },
    { icon: Layers, label: 'AI Organize', path: '/ai-organize' },
    { icon: HardDrive, label: 'Drive Sync', path: '/drive' },
    { icon: ShoppingBag, label: 'Shopify Push', path: '/shopify' },
    { icon: CreditCard, label: 'Billing', path: '/billing' },
];

export const Sidebar: React.FC = () => {
    const { user, logout } = useAuth();

    const truncateEmail = (email?: string) => {
        if (!email) return '';
        return email.length > 20 ? email.substring(0, 17) + '...' : email;
    };

    return (
        <aside className="w-[240px] bg-bg-card border-r border-bg-border flex flex-col h-screen sticky top-0 shrink-0">
            <div className="p-6 flex items-center gap-3">
                <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent-glow">
                    <Zap className="text-white fill-current" size={20} />
                </div>
                <h1 className="font-bold text-lg tracking-tight">ThrivePhoto</h1>
            </div>

            <nav className="flex-1 mt-4">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
              flex items-center gap-4 px-6 py-3.5 font-medium transition-all group border-l-2
              ${isActive
                                ? 'bg-bg-border/50 text-white border-accent'
                                : 'text-text-secondary border-transparent hover:bg-bg-border/30 hover:text-text-primary'}
            `}
                    >
                        <item.icon size={18} className="transition-transform group-hover:scale-110" />
                        <span className="text-sm">{item.label}</span>
                    </NavLink>
                ))}

                {user?.isAdmin && (
                    <NavLink
                        to="/admin"
                        className={({ isActive }) => `
              flex items-center gap-4 px-6 py-3.5 font-medium transition-all group border-l-2 mt-4
              ${isActive
                                ? 'bg-bg-border/50 text-white border-accent'
                                : 'text-text-secondary border-transparent hover:bg-bg-border/30 hover:text-text-primary'}
            `}
                    >
                        <ShieldCheck size={18} className="transition-transform group-hover:scale-110" />
                        <span className="text-sm">Admin Panel</span>
                    </NavLink>
                )}
            </nav>

            <div className="p-4 border-t border-bg-border space-y-4">
                <div className="flex items-center gap-3 bg-bg-border/20 p-3 rounded-xl border border-bg-border/30">
                    <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold">
                        {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-text-primary truncate">{truncateEmail(user?.email)}</p>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] text-text-muted font-medium uppercase tracking-widest">{user?.plan || 'Free'}</p>
                            {user?.isAdmin && (
                                <span className="text-[9px] font-black text-accent uppercase tracking-tighter leading-none">(Admin)</span>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-danger hover:bg-danger/10 transition-all group"
                >
                    <LogOut size={16} className="transition-transform group-hover:-translate-x-1" />
                    <span>LOGOUT</span>
                </button>
            </div>
        </aside>
    );
};
