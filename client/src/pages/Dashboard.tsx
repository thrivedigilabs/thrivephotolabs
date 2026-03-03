import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Zap,
    Layers,
    HardDrive,
    Image as ImageIcon,
    Brain,
    CreditCard,
    TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();

    const stats = [
        { label: 'Images Processed', value: '1,248', icon: ImageIcon, color: 'text-accent', trend: '+12% this week' },
        { label: 'AI Batches Used', value: '42', icon: Brain, color: 'text-success', trend: '3 remaining in Free' },
        { label: 'Current Plan', value: 'Creator', icon: CreditCard, color: 'text-warning', trend: 'Next bill in 12 days' },
        { label: 'Storage Saved', value: '4.2 GB', icon: TrendingUp, color: 'text-danger', trend: 'Average 68% per file' },
    ];

    const quickActions = [
        {
            title: 'Optimize Images',
            desc: 'Lossless compression and resizing for web.',
            icon: Zap,
            path: '/optimize',
            color: 'bg-accent'
        },
        {
            title: 'AI Smart Organize',
            desc: 'Intelligent grouping and renaming of shots.',
            icon: Layers,
            path: '/ai-organize',
            color: 'bg-success'
        },
        {
            title: 'Sync from Drive',
            desc: 'Import original photos from Google Drive.',
            icon: HardDrive,
            path: '/drive',
            color: 'bg-warning'
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h1>
                <p className="text-text-secondary">Here's what's happening with your Photo Labs workspace.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={stat.label}
                        className="bg-bg-card border border-bg-border rounded-2xl p-6 hover:border-accent/30 transition-colors group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-lg bg-bg-border/50 ${stat.color} group-hover:scale-110 transition-transform`}>
                                <stat.icon size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{stat.trend}</span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-bold">{stat.value}</h3>
                            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">{stat.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <section className="space-y-6">
                <h2 className="text-xl font-bold px-1">Quick Start</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {quickActions.map((action, i) => (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 + (i * 0.1) }}
                            key={action.title}
                            onClick={() => navigate(action.path)}
                            className="bg-bg-card border border-bg-border rounded-2xl p-1 overflow-hidden group hover:border-accent/50 hover:shadow-2xl hover:shadow-accent-glow transition-all text-left"
                        >
                            <div className="p-6">
                                <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center mb-6 shadow-lg shadow-black/20 group-hover:scale-110 transition-transform`}>
                                    <action.icon className="text-white" size={24} />
                                </div>
                                <h3 className="text-lg font-bold mb-2 text-text-primary group-hover:text-accent transition-colors">{action.title}</h3>
                                <p className="text-sm text-text-secondary leading-relaxed">{action.desc}</p>
                            </div>
                            <div className="px-6 py-3 bg-bg-border/30 border-t border-bg-border flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-text-muted group-hover:text-text-primary transition-colors">
                                <span>Start Session</span>
                                <span>→</span>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
