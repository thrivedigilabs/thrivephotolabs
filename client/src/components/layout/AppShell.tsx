import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import Dashboard from '../../pages/Dashboard';
import Optimize from '../../pages/Optimize';
import AIOrganize from '../../pages/AIOrganize';
import DriveSync from '../../pages/DriveSync';
import ShopifyPush from '../../pages/ShopifyPush';
import Billing from '../../pages/Billing';
import AdminPanel from '../../pages/admin/AdminPanel';

const AppShell: React.FC = () => {
    const location = useLocation();

    const tabs = [
        { path: '/dashboard', component: Dashboard },
        { path: '/optimize', component: Optimize },
        { path: '/ai-organize', component: AIOrganize },
        { path: '/drive', component: DriveSync },
        { path: '/shopify', component: ShopifyPush },
        { path: '/billing', component: Billing },
        { path: '/admin', component: AdminPanel },
    ];

    return (
        <div className="flex h-screen bg-bg text-text-primary overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <Header />
                <main className="flex-1 relative bg-bg overflow-hidden">
                    {tabs.map((tab) => (
                        <div
                            key={tab.path}
                            className="absolute inset-0 overflow-y-auto"
                            style={{ display: location.pathname === tab.path ? 'block' : 'none' }}
                        >
                            <tab.component />
                        </div>
                    ))}
                </main>
            </div>
        </div>
    );
};

export default AppShell;
