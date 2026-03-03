import React, { useState, useEffect, useMemo } from 'react';
import {
    ShoppingBag,
    Plus,
    Trash2,
    Store,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Settings,
    Upload,
    Package,
    RefreshCcw,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabStore } from '../store/tabStore';
import apiClient from '../lib/apiClient';

interface ShopifyStore {
    id: number;
    shopDomain: string;
}

export const ShopifyPush: React.FC = () => {
    const { optimize } = useTabStore();
    const [stores, setStores] = useState<ShopifyStore[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [productTitles, setProductTitles] = useState<Record<string, string>>({});
    const [isConnecting, setIsConnecting] = useState(false);
    const [newStoreDomain, setNewStoreDomain] = useState('');
    const [isPushing, setIsPushing] = useState(false);
    const [pushProgress, setPushProgress] = useState(0);
    const [pushResult, setPushResult] = useState<{ created: number; errors: string[] } | null>(null);

    const doneItems = useMemo(() =>
        optimize.queue.filter(i => i.status === 'done' && i.outputBlob),
        [optimize.queue]);

    const fetchStores = async () => {
        try {
            const { data } = await apiClient.get('/api/shopify/stores');
            setStores(data);
            if (data.length > 0 && !selectedStoreId) setSelectedStoreId(data[0].id);
        } catch (err) {
            console.error('Failed to fetch stores');
        }
    };

    useEffect(() => {
        fetchStores();
    }, []);

    // Initialize titles when doneItems change
    useEffect(() => {
        const newTitles = { ...productTitles };
        doneItems.forEach(item => {
            if (!newTitles[item.id]) {
                const baseName = item.outputName?.replace('.webp', '') || 'Product';
                newTitles[item.id] = baseName.split('-').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
            }
        });
        setProductTitles(newTitles);
    }, [doneItems]);

    const connectShopify = async () => {
        if (!newStoreDomain) return;
        try {
            const { data } = await apiClient.post('/api/shopify/auth-url', { shopDomain: newStoreDomain });
            const popup = window.open(data.authUrl, 'shopify-auth', 'width=600,height=700');

            const messageHandler = (e: MessageEvent) => {
                if (e.data?.type === 'SHOPIFY_AUTH_SUCCESS') {
                    fetchStores();
                    setIsConnecting(false);
                    setNewStoreDomain('');
                    window.removeEventListener('message', messageHandler);
                }
            };
            window.addEventListener('message', messageHandler);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to connect store');
        }
    };

    const deleteStore = async (id: number) => {
        if (!confirm('Disconnect this Shopify store?')) return;
        try {
            await apiClient.delete(`/api/shopify/stores/${id}`);
            fetchStores();
            if (selectedStoreId === id) setSelectedStoreId(null);
        } catch (err) {
            alert('Failed to delete store');
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handlePush = async () => {
        if (!selectedStoreId || selectedIds.size === 0) return;

        setIsPushing(true);
        setPushProgress(0);
        setPushResult(null);

        const itemsToPush = doneItems.filter(i => selectedIds.has(i.id));
        const products = [];

        // Convert blobs to base64 for easy JSON transfer (standard Shopify pattern for small batches)
        for (const item of itemsToPush) {
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(item.outputBlob!);
                reader.onloadend = () => resolve(reader.result as string);
            });
            products.push({
                title: productTitles[item.id],
                imageBlob: base64,
                filename: item.outputName
            });
        }

        try {
            const { data } = await apiClient.post('/api/shopify/push', {
                storeId: selectedStoreId,
                products
            });
            setPushResult(data);
            setPushProgress(100);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Push failed');
        } finally {
            setIsPushing(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Store Management Section */}
            <section className="bg-bg-card border border-bg-border rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ShoppingBag className="text-accent" size={24} />
                        <h2 className="text-xl font-bold text-text-primary">Connected Shopify Stores</h2>
                    </div>
                    <button
                        onClick={() => setIsConnecting(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent hover:bg-accent hover:text-white font-bold rounded-xl transition-all"
                    >
                        <Plus size={18} />
                        Add Shopify Store
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stores.map(store => (
                        <div
                            key={store.id}
                            className={`p-4 rounded-xl border transition-all flex items-center justify-between ${selectedStoreId === store.id ? 'bg-accent/5 border-accent shadow-[0_0_15px_rgba(108,99,255,0.1)]' : 'bg-bg border-bg-border hover:border-text-muted'}`}
                        >
                            <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setSelectedStoreId(store.id)}>
                                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success">
                                    <Store size={20} />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-bold truncate">{store.shopDomain}</p>
                                    <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Connected</p>
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteStore(store.id); }}
                                className="p-2 text-text-muted hover:text-danger transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    {stores.length === 0 && (
                        <div className="col-span-full py-8 text-center text-text-muted border-2 border-dashed border-bg-border rounded-xl">
                            <p>No stores connected. Add one to start pushing products.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Push Configuration */}
            {stores.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Items List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-bg-card border border-bg-border rounded-2xl p-6 shadow-xl space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Package size={20} className="text-accent" />
                                    Optimized Products ({doneItems.length})
                                </h3>
                                <button
                                    onClick={() => setSelectedIds(selectedIds.size === doneItems.length ? new Set() : new Set(doneItems.map(i => i.id)))}
                                    className="text-xs font-bold text-accent hover:underline"
                                >
                                    {selectedIds.size === doneItems.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {doneItems.map(item => (
                                    <div
                                        key={item.id}
                                        className={`p-4 rounded-xl border transition-all flex items-center gap-4 ${selectedIds.has(item.id) ? 'bg-bg border-accent shadow-sm' : 'bg-bg/50 border-bg-border'}`}
                                    >
                                        <div
                                            className="cursor-pointer"
                                            onClick={() => toggleSelect(item.id)}
                                        >
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.has(item.id) ? 'bg-accent border-accent text-white' : 'border-text-muted'}`}>
                                                {selectedIds.has(item.id) && <CheckCircle2 size={12} />}
                                            </div>
                                        </div>
                                        <div className="w-12 h-12 rounded-lg bg-bg-border overflow-hidden flex-shrink-0">
                                            {item.outputBlob && (
                                                <img
                                                    src={URL.createObjectURL(item.outputBlob)}
                                                    className="w-full h-full object-cover"
                                                    onLoad={(e) => URL.revokeObjectURL((e.target as any).src)}
                                                />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Product Title</label>
                                            <input
                                                type="text"
                                                className="w-full bg-bg border border-bg-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
                                                value={productTitles[item.id] || ''}
                                                onChange={(e) => setProductTitles({ ...productTitles, [item.id]: e.target.value })}
                                                disabled={!selectedIds.has(item.id)}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {doneItems.length === 0 && (
                                    <div className="py-20 text-center text-text-muted border-2 border-dashed border-bg-border rounded-xl">
                                        <p>No optimized images ready. Go to Customize first.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Panel */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-bg-card border border-bg-border rounded-2xl p-6 shadow-xl space-y-6 border-t-4 border-t-accent sticky top-24">
                            <h3 className="font-bold">Push to Shopify</h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Target Store</label>
                                    <select
                                        className="w-full bg-bg border border-bg-border rounded-xl px-4 py-3 text-sm focus:border-accent outline-none appearance-none"
                                        value={selectedStoreId || ''}
                                        onChange={(e) => setSelectedStoreId(parseInt(e.target.value))}
                                    >
                                        {stores.map(s => (
                                            <option key={s.id} value={s.id}>{s.shopDomain}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="p-4 bg-accent/5 rounded-xl space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-text-secondary">Selected items:</span>
                                        <span className="font-bold text-text-primary">{selectedIds.size}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-text-secondary">Store:</span>
                                        <span className="font-bold text-accent truncate max-w-[150px]">
                                            {stores.find(s => s.id === selectedStoreId)?.shopDomain || 'None'}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={handlePush}
                                    disabled={selectedIds.size === 0 || !selectedStoreId || isPushing}
                                    className="w-full py-4 bg-accent hover:bg-accent-hover text-white font-bold rounded-xl shadow-lg shadow-accent-glow transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isPushing ? <RefreshCcw className="animate-spin" size={20} /> : <Upload size={20} />}
                                    Push {selectedIds.size} Products
                                </button>
                            </div>

                            {/* Push Status / Results */}
                            <AnimatePresence>
                                {isPushing && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-2"
                                    >
                                        <div className="flex justify-between text-xs font-bold uppercase">
                                            <span>Processing...</span>
                                            <span>{pushProgress}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-bg-border rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-accent transition-all duration-300"
                                                style={{ width: `${pushProgress}%` }}
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                {pushResult && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 rounded-xl border border-bg-border space-y-3"
                                    >
                                        <p className="text-sm font-bold flex items-center gap-2">
                                            <CheckCircle2 className="text-success" size={16} />
                                            {pushResult.created} Products Created
                                        </p>
                                        {pushResult.errors.length > 0 && (
                                            <div className="space-y-1.5">
                                                <p className="text-xs font-bold text-danger flex items-center gap-2">
                                                    <AlertCircle size={14} />
                                                    {pushResult.errors.length} Errors
                                                </p>
                                                <div className="max-h-24 overflow-y-auto text-[10px] text-text-muted bg-danger/5 p-2 rounded border border-danger/10">
                                                    {pushResult.errors.map((err, idx) => (
                                                        <p key={idx}>{err}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            )}

            {/* Connection Modal */}
            <AnimatePresence>
                {isConnecting && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
                            onClick={() => setIsConnecting(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-bg-card border border-bg-border rounded-3xl p-8 shadow-2xl"
                        >
                            <button
                                onClick={() => setIsConnecting(false)}
                                className="absolute top-6 right-6 p-2 text-text-muted hover:text-text-primary rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="space-y-6">
                                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                                    <ShoppingBag size={32} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-bold">Add Shopify Store</h3>
                                    <p className="text-text-secondary">Enter your .myshopify.com domain to begin OAuth connection.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-widest ml-1">Shop Domain</label>
                                    <input
                                        type="text"
                                        placeholder="my-awesome-store.myshopify.com"
                                        className="w-full bg-bg border border-bg-border rounded-xl px-4 py-3 text-sm focus:border-accent outline-none"
                                        value={newStoreDomain}
                                        onChange={(e) => setNewStoreDomain(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && connectShopify()}
                                    />
                                </div>
                                <button
                                    onClick={connectShopify}
                                    disabled={!newStoreDomain}
                                    className="w-full py-4 bg-accent hover:bg-accent-hover text-white font-bold rounded-xl shadow-lg shadow-accent-glow transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    Connect Store
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
export default ShopifyPush;
