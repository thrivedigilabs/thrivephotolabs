import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import { PLAN_LIMITS } from '../../types';

const routeTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/optimize': 'Image Optimization',
    '/ai-organize': 'AI Smart Organizer',
    '/drive': 'Google Drive Sync',
    '/shopify': 'Shopify Push',
    '/billing': 'Subscription & Billing',
    '/admin': 'Admin Control Panel',
};

export const Header: React.FC = () => {
    const location = useLocation();
    const { user } = useAuth();
    const [usage, setUsage] = useState({ imagesProcessed: 0, aiBatchesUsed: 0 });

    const title = routeTitles[location.pathname] || 'ThrivePhotoLabs';

    useEffect(() => {
        if (!user) return;
        const fetchUsage = async () => {
            try {
                const response = await apiClient.get('/api/usage/me');
                setUsage(response.data);
            } catch (err) {
                console.error('Failed to fetch header usage stats');
            }
        };
        fetchUsage();

        // Listen for custom event to refresh usage (triggered after optimization)
        const handleRefresh = () => fetchUsage();
        window.addEventListener('refresh-usage', handleRefresh);
        return () => window.removeEventListener('refresh-usage', handleRefresh);
    }, [user, location.pathname]);

    const usageLimit = user ? PLAN_LIMITS[user.plan].imagesPerMonth : 50;
    const usagePercent = Math.min(100, (usage.imagesProcessed / usageLimit) * 100);

    return (
        <header className="h-[60px] border-b border-bg-border flex items-center justify-between px-8 bg-bg/50 backdrop-blur-md sticky top-0 z-30">
            <h2 className="text-lg font-bold text-text-primary tracking-tight">{title}</h2>

            <div className="flex items-center gap-6">
                <div className="flex flex-col items-end gap-1.5 w-48">
                    <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                        <span>Monthly Usage</span>
                        <span className="text-text-primary font-bold">{usage.imagesProcessed} / {usageLimit}</span>
                    </div>
                    <div className="h-1.5 w-full bg-bg-border rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(108,99,255,0.4)]"
                            style={{ width: `${usagePercent}%` }}
                        />
                    </div>
                </div>

                <div className="h-8 w-[1px] bg-bg-border" />

                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-accent">
                        {user?.plan || 'Free'}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-bg-border border border-bg-border overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center bg-accent text-[10px] font-bold text-white uppercase">
                            {user?.email?.charAt(0) || 'U'}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
