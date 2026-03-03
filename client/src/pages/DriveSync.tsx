import React, { useState, useEffect, useMemo } from 'react';
import {
    Cloud,
    RefreshCcw,
    FolderOpen,
    ArrowRight,
    CheckCircle2,
    LogOut,
    Search,
    Download,
    UploadCloud,
    LayoutGrid,
    CheckSquare,
    Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabStore } from '../store/tabStore';
import { useQueue } from '../hooks/useQueue';
import apiClient from '../lib/apiClient';
import { useNavigate } from 'react-router-dom';

export const DriveSync: React.FC = () => {
    const { drive, setDrive, optimize } = useTabStore();
    const { addFiles } = useQueue();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [statusLoading, setStatusLoading] = useState(true);

    const refetchStatus = async () => {
        try {
            const { data } = await apiClient.get('/api/drive/status');
            setDrive({ isConnected: data.connected, connectedEmail: data.email });
        } catch (err) {
            console.error('Failed to fetch drive status');
        } finally {
            setStatusLoading(false);
        }
    };

    useEffect(() => {
        refetchStatus();
    }, []);

    const connectDrive = async () => {
        try {
            const { data } = await apiClient.get('/api/drive/auth-url');
            const popup = window.open(data.authUrl, 'drive-auth', 'width=500,height=600');

            const messageHandler = (e: MessageEvent) => {
                if (e.data?.type === 'DRIVE_AUTH_SUCCESS') {
                    refetchStatus();
                    window.removeEventListener('message', messageHandler);
                }
            };
            window.addEventListener('message', messageHandler);
        } catch (err) {
            alert('Failed to initialize Google Drive connection');
        }
    };

    const disconnectDrive = async () => {
        if (!confirm('Are you sure you want to disconnect Google Drive?')) return;
        try {
            await apiClient.delete('/api/drive/disconnect');
            setDrive({ isConnected: false, connectedEmail: null, fetchedImages: [] });
        } catch (err) {
            alert('Failed to disconnect');
        }
    };

    const fetchFolderImages = async () => {
        if (!drive.sourceFolderUrl) return;
        setDrive({ isFetching: true });
        try {
            const { data } = await apiClient.post('/api/drive/fetch-folder', {
                folderUrl: drive.sourceFolderUrl
            });
            setDrive({ fetchedImages: data });
            setSelectedIds(new Set());
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to fetch folder');
        } finally {
            setDrive({ isFetching: false });
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === drive.fetchedImages.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(drive.fetchedImages.map(f => f.id)));
        }
    };

    const syncToOptimize = async () => {
        const selected = drive.fetchedImages.filter(f => selectedIds.has(f.id));
        if (selected.length === 0) return;

        alert(`Preparing to download ${selected.length} images. This might take a moment...`);

        const filesToQueue: File[] = [];
        for (const driveFile of selected) {
            try {
                // Fetch file via proxy to avoid CORS and handle auth
                const response = await apiClient.get(`/api/drive/file/${driveFile.id}`, {
                    responseType: 'blob'
                });
                const file = new File([response.data], driveFile.name, { type: response.headers['content-type'] });
                filesToQueue.push(file);
            } catch (err) {
                console.error(`Failed to download ${driveFile.name}`, err);
            }
        }

        if (filesToQueue.length > 0) {
            addFiles(filesToQueue);
            // In our AppShell, we don't actually navigate, we just change tab? 
            // Actually App.tsx uses normal routes.
            // But AppShell uses display: none.
            // Let's assume the user clicks the sidebar, but we can't easily programmatically switch "tabs" 
            // if they are just display: none without updating some state.
            // Wait, our Sidebar uses NavLink. So navigation is real.
            window.location.hash = '#/optimize'; // Simple way to trigger route change if using HashRouter or similar
            // Since we use BrowserRouter in App.tsx, we should use navigate hook
        }
    };

    // For better experience, let's use the actual navigate
    const navigate = useNavigate();
    const handleSyncClick = async () => {
        await syncToOptimize();
        navigate('/optimize');
    };

    const uploadDoneToDrive = async () => {
        const doneItems = optimize.queue.filter(i => i.status === 'done' && i.outputBlob);
        if (doneItems.length === 0) {
            alert('No optimized images ready to upload.');
            return;
        }

        if (!drive.destFolderUrl) {
            alert('Please provide a destination folder URL.');
            return;
        }

        let destId = '';
        const match = drive.destFolderUrl.match(/[-\w]{25,}/);
        if (match) destId = match[0];
        if (!destId) {
            alert('Invalid destination folder URL.');
            return;
        }

        alert(`Uploading ${doneItems.length} images to Google Drive...`);

        for (const item of doneItems) {
            try {
                const formData = new FormData();
                formData.append('file', item.outputBlob!, item.outputName!);
                formData.append('fileName', item.outputName!);
                formData.append('destFolderId', destId);

                await apiClient.post('/api/drive/upload', formData);
            } catch (err) {
                console.error(`Failed to upload ${item.outputName}`, err);
            }
        }
        alert('Upload process finished.');
    };

    if (statusLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <RefreshCcw className="animate-spin text-accent" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header / Connection Status */}
            <div className="bg-bg-card border border-bg-border rounded-2xl p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                        <Cloud size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Google Drive Sync</h1>
                        <p className="text-text-secondary mt-1">Fetch source images and upload optimized results directly.</p>
                    </div>
                </div>

                {drive.isConnected ? (
                    <div className="flex items-center gap-4">
                        <div className="px-4 py-2 bg-success/10 border border-success/20 rounded-xl flex items-center gap-2">
                            <CheckCircle2 className="text-success" size={18} />
                            <span className="text-sm font-bold text-success">{drive.connectedEmail}</span>
                        </div>
                        <button
                            onClick={disconnectDrive}
                            className="p-2.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
                            title="Disconnect Drive"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={connectDrive}
                        className="px-8 py-3 bg-accent hover:bg-accent-hover text-white font-bold rounded-xl shadow-lg shadow-accent-glow transition-all flex items-center gap-3"
                    >
                        <Cloud size={20} />
                        Connect Google Drive
                    </button>
                )}
            </div>

            {drive.isConnected && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Configuration & Fetching */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-bg-card border border-bg-border rounded-2xl p-6 shadow-xl space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <FolderOpen size={20} className="text-accent" />
                                    Source Folder
                                </h3>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Folder URL</label>
                                    <input
                                        type="text"
                                        placeholder="Paste Google Drive folder URL..."
                                        className="w-full bg-bg border border-bg-border rounded-xl px-4 py-3 text-sm focus:border-accent outline-none"
                                        value={drive.sourceFolderUrl}
                                        onChange={(e) => setDrive({ sourceFolderUrl: e.target.value })}
                                    />
                                </div>
                                <button
                                    onClick={fetchFolderImages}
                                    disabled={!drive.sourceFolderUrl || drive.isFetching}
                                    className="w-full py-3 bg-accent/10 hover:bg-accent text-accent hover:text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {drive.isFetching ? <RefreshCcw className="animate-spin" size={18} /> : <Search size={18} />}
                                    Fetch Images
                                </button>
                            </div>

                            <hr className="border-bg-border" />

                            <div className="space-y-4">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <UploadCloud size={20} className="text-success" />
                                    Destination folder
                                </h3>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Upload URL</label>
                                    <input
                                        type="text"
                                        placeholder="Paste destination folder URL..."
                                        className="w-full bg-bg border border-bg-border rounded-xl px-4 py-3 text-sm focus:border-accent outline-none"
                                        value={drive.destFolderUrl}
                                        onChange={(e) => setDrive({ destFolderUrl: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Summary Card */}
                        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6">
                            <h4 className="font-bold text-accent mb-2">Sync Stats</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary">Images found:</span>
                                    <span className="font-bold text-text-primary">{drive.fetchedImages.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary">Selected:</span>
                                    <span className="font-bold text-accent">{selectedIds.size}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary">Ready to upload:</span>
                                    <span className="font-bold text-success">
                                        {optimize.queue.filter(i => i.status === 'done').length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Image Grid */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-bg-card border border-bg-border rounded-2xl p-6 shadow-xl min-h-[500px] flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <LayoutGrid size={20} className="text-accent" />
                                    Folder Contents
                                </h3>
                                {drive.fetchedImages.length > 0 && (
                                    <button
                                        onClick={toggleSelectAll}
                                        className="text-xs font-bold text-accent hover:underline flex items-center gap-1.5"
                                    >
                                        {selectedIds.size === drive.fetchedImages.length ? <CheckSquare size={14} /> : <Square size={14} />}
                                        {selectedIds.size === drive.fetchedImages.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                )}
                            </div>

                            {drive.fetchedImages.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 flex-1">
                                    <AnimatePresence>
                                        {drive.fetchedImages.map((file) => (
                                            <motion.div
                                                key={file.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                className={`
                                                    relative group aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all
                                                    ${selectedIds.has(file.id) ? 'border-accent ring-2 ring-accent/20' : 'border-bg-border hover:border-accent/50'}
                                                `}
                                                onClick={() => toggleSelect(file.id)}
                                            >
                                                <img
                                                    src={file.thumbnailLink?.replace('s220', 's400')}
                                                    alt={file.name}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                                                    <p className="text-[10px] text-white truncate font-medium">{file.name}</p>
                                                </div>
                                                <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.has(file.id) ? 'bg-accent border-accent text-white' : 'bg-black/20 border-white/50 text-transparent'}`}>
                                                    <CheckCircle2 size={12} />
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-4 border-2 border-dashed border-bg-border rounded-xl">
                                    <div className="w-16 h-16 rounded-full bg-bg-border/50 flex items-center justify-center">
                                        <Search size={32} />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold">No images found yet</p>
                                        <p className="text-sm">Enter a folder URL above to start fetching.</p>
                                    </div>
                                </div>
                            )}

                            {/* Sticky Action Bar */}
                            <div className="mt-8 pt-6 border-t border-bg-border flex flex-wrap gap-4 items-center justify-end">
                                <button
                                    onClick={handleSyncClick}
                                    disabled={selectedIds.size === 0}
                                    className="px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-accent-glow"
                                >
                                    <Download size={18} />
                                    Sync to Optimize ({selectedIds.size})
                                </button>
                                <button
                                    onClick={uploadDoneToDrive}
                                    disabled={!drive.destFolderUrl || optimize.queue.filter(i => i.status === 'done').length === 0}
                                    className="px-6 py-2.5 bg-success hover:bg-success-hover disabled:opacity-50 font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-success/20"
                                >
                                    <UploadCloud size={18} />
                                    Upload Done to Drive
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default DriveSync;
