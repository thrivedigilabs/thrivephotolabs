import React, { useState, useRef } from 'react';
import {
    Upload,
    Zap,
    Play,
    CircleSlash,
    Download,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    FileDown,
    Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabStore } from '../store/tabStore';
import { useQueue } from '../hooks/useQueue';
import { formatBytes } from '../lib/compressBlob';
import { DropZone } from '../components/ui/DropZone';

export const Optimize: React.FC = () => {
    const { optimize, setOptimize } = useTabStore();
    const { addFiles, startProcessing, cancelProcessing, downloadAll, clearQueue, logDownload } = useQueue();
    const stats = {
        total: optimize.queue.length,
        pending: optimize.queue.filter(i => i.status === 'pending').length,
        processing: optimize.queue.filter(i => i.status === 'processing').length,
        done: optimize.queue.filter(i => i.status === 'done').length,
        error: optimize.queue.filter(i => i.status === 'error').length,
    };

    const progress = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;

    const [lockAspect, setLockAspect] = useState(true);

    const handleWidthChange = (val: number) => {
        const updates: any = { outputWidth: val };
        if (lockAspect) updates.outputHeight = val;
        setOptimize(updates);
    };

    const handleHeightChange = (val: number) => {
        const updates: any = { outputHeight: val };
        if (lockAspect) updates.outputWidth = val;
        setOptimize(updates);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Section A: Settings Bar */}
            <div className="bg-bg-card border border-bg-border rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wider text-text-secondary font-medium ml-1">
                            Output Resolution
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col items-center gap-1">
                                <input
                                    type="number"
                                    min={100}
                                    max={5000}
                                    step={100}
                                    value={optimize.outputWidth}
                                    onChange={(e) => handleWidthChange(Number(e.target.value))}
                                    className="w-24 bg-bg border border-bg-border rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-accent transition-all"
                                />
                                <span className="text-[10px] text-text-muted uppercase font-bold tracking-tighter">Width</span>
                            </div>
                            <span className="text-text-secondary text-lg mt-1">×</span>
                            <div className="flex flex-col items-center gap-1">
                                <input
                                    type="number"
                                    min={100}
                                    max={5000}
                                    step={100}
                                    value={optimize.outputHeight}
                                    onChange={(e) => handleHeightChange(Number(e.target.value))}
                                    className="w-24 bg-bg border border-bg-border rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-accent transition-all"
                                />
                                <span className="text-[10px] text-text-muted uppercase font-bold tracking-tighter">Height</span>
                            </div>
                            <span className="text-text-secondary text-sm ml-1 mt-1">px</span>
                        </div>
                        <label className="flex items-center gap-2 text-[10px] text-text-secondary cursor-pointer mt-1 ml-1 font-bold uppercase tracking-wider hover:text-text-primary transition-colors">
                            <input
                                type="checkbox"
                                checked={lockAspect}
                                onChange={(e) => {
                                    setLockAspect(e.target.checked);
                                    if (e.target.checked) handleWidthChange(optimize.outputWidth);
                                }}
                                className="accent-accent"
                            />
                            Lock to square (1:1)
                        </label>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-text-secondary font-medium ml-1">
                            <Palette size={14} /> Background Fill
                        </label>
                        <div className="flex items-center gap-2">
                            {[
                                { id: '#FFFFFF', label: 'White' },
                                { id: '#000000', label: 'Black' },
                                { id: 'transparent', label: 'Trans' },
                            ].map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => setOptimize({ bgColor: preset.id })}
                                    className={`
                                        px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border
                                        ${optimize.bgColor === preset.id
                                            ? 'bg-accent/20 border-accent text-accent'
                                            : 'bg-bg border-bg-border text-text-muted hover:border-text-muted'}
                                    `}
                                >
                                    {preset.label}
                                </button>
                            ))}
                            <div className="relative flex items-center gap-2 ml-2">
                                <input
                                    type="color"
                                    value={optimize.bgColor.startsWith('#') ? optimize.bgColor : '#FFFFFF'}
                                    onChange={(e) => setOptimize({ bgColor: e.target.value })}
                                    className="w-8 h-8 rounded-lg bg-bg border border-bg-border cursor-pointer overflow-hidden p-0"
                                />
                                <span className="text-[10px] text-text-muted font-bold uppercase">Custom</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {optimize.queue.some(i => i.status === 'done') && (
                            <button
                                onClick={downloadAll}
                                className="flex items-center gap-2 px-6 py-2.5 bg-success/10 text-success hover:bg-success/20 font-bold rounded-xl transition-all"
                            >
                                <FileDown size={18} />
                                Download All (.zip)
                            </button>
                        )}
                        <button
                            onClick={clearQueue}
                            className="flex items-center gap-2 px-4 py-2.5 text-text-secondary hover:text-danger hover:bg-danger/10 font-bold rounded-xl transition-all"
                        >
                            <Trash2 size={18} />
                            Clear All
                        </button>
                        {optimize.isProcessing ? (
                            <button
                                onClick={cancelProcessing}
                                className="flex items-center gap-2 px-8 py-2.5 bg-danger/10 text-danger hover:bg-danger/20 font-bold rounded-xl transition-all"
                            >
                                <CircleSlash size={18} />
                                Cancel
                            </button>
                        ) : (
                            <button
                                onClick={startProcessing}
                                disabled={stats.pending === 0}
                                className="flex items-center gap-2 px-8 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed font-bold rounded-xl shadow-lg shadow-accent-glow transition-all"
                            >
                                <Play size={18} className="fill-current" />
                                Start Processing
                            </button>
                        )}
                    </div>
                </div>

                <DropZone
                    onFilesSelected={addFiles}
                    fileCount={optimize.queue.length}
                />
            </div>

            {/* Section B: Queue Stats Bar */}
            <AnimatePresence>
                {optimize.queue.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                    >
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="px-3 py-1 bg-bg-border/50 rounded-lg text-xs font-bold text-text-secondary">
                                Total: <span className="text-text-primary ml-1">{stats.total}</span>
                            </span>
                            <span className="px-3 py-1 bg-warning/10 rounded-lg text-xs font-bold text-warning">
                                ⏳ Pending: <span className="ml-1">{stats.pending}</span>
                            </span>
                            <span className="px-3 py-1 bg-accent/10 rounded-lg text-xs font-bold text-accent">
                                ⚙️ Processing: <span className="ml-1">{stats.processing}</span>
                            </span>
                            <span className="px-3 py-1 bg-success/10 rounded-lg text-xs font-bold text-success">
                                ✅ Done: <span className="ml-1">{stats.done}</span>
                            </span>
                            {stats.error > 0 && (
                                <span className="px-3 py-1 bg-danger/10 rounded-lg text-xs font-bold text-danger">
                                    ❌ Error: <span className="ml-1">{stats.error}</span>
                                </span>
                            )}
                        </div>
                        <div className="h-2 w-full bg-bg-border rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="h-full bg-accent shadow-[0_0_12px_rgba(108,99,255,0.4)]"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Section C: Queue Table */}
            <div className="bg-bg-card border border-bg-border rounded-2xl overflow-hidden shadow-xl">
                <div className="max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-bg-card/80 backdrop-blur-md z-20 border-b border-bg-border">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Thumbnail</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Filename</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Size Info</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-bg-border">
                            <AnimatePresence mode="popLayout">
                                {optimize.queue.map((item, idx) => (
                                    <motion.tr
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        key={item.id}
                                        className="group hover:bg-bg-border/20 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="w-12 h-12 bg-bg rounded-lg overflow-hidden border border-bg-border">
                                                <img
                                                    src={URL.createObjectURL(item.file)}
                                                    className="w-full h-full object-cover"
                                                    alt="preview"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-text-primary truncate max-w-[200px]">{item.file.name}</p>
                                            <p className="text-[10px] text-text-muted uppercase tracking-wider">{item.file.type}</p>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-text-secondary">{formatBytes(item.originalSize)}</span>
                                                {item.finalSize && (
                                                    <>
                                                        <span className="text-text-muted">→</span>
                                                        <span className={`text-xs font-bold ${item.finalSize < item.originalSize ? 'text-success' : 'text-warning'}`}>
                                                            {formatBytes(item.finalSize)}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            {item.finalSize && (
                                                <p className="text-[10px] font-bold text-success mt-0.5">
                                                    -{Math.round((1 - item.finalSize / item.originalSize) * 100)}% compressed
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.status === 'pending' && (
                                                <div className="flex items-center gap-2 text-text-muted text-xs font-bold px-2.5 py-1 bg-bg-border/50 rounded-full w-fit">
                                                    <CircleSlash size={12} />
                                                    Waiting
                                                </div>
                                            )}
                                            {item.status === 'processing' && (
                                                <div className="flex items-center gap-2 text-accent text-xs font-bold px-2.5 py-1 bg-accent/10 rounded-full w-fit">
                                                    <Loader2 size={12} className="animate-spin" />
                                                    Compressing...
                                                </div>
                                            )}
                                            {item.status === 'done' && (
                                                <div className="flex items-center gap-2 text-success text-xs font-bold px-2.5 py-1 bg-success/10 rounded-full w-fit">
                                                    <CheckCircle2 size={12} />
                                                    ✓ Done
                                                </div>
                                            )}
                                            {item.status === 'error' && (
                                                <div className="flex items-center gap-2 text-danger text-xs font-bold px-2.5 py-1 bg-danger/10 rounded-full w-fit group/error relative">
                                                    <AlertCircle size={12} />
                                                    Error
                                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover/error:block bg-danger text-white text-[10px] p-2 rounded shadow-xl w-48 z-50">
                                                        {item.error || 'Compression encountered an error.'}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {item.status === 'done' && item.outputBlob && (
                                                <button
                                                    onClick={() => {
                                                        const url = URL.createObjectURL(item.outputBlob!);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = item.outputName;
                                                        document.body.appendChild(a);
                                                        a.click();
                                                        document.body.removeChild(a);
                                                        URL.revokeObjectURL(url);
                                                        logDownload(item);
                                                    }}
                                                    className="p-2 text-text-secondary hover:text-accent transition-colors"
                                                    title="Download optimized image"
                                                >
                                                    <Download size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                    {optimize.queue.length === 0 && (
                        <div className="p-20 text-center space-y-3">
                            <div className="w-16 h-16 bg-bg-border/30 rounded-full flex items-center justify-center mx-auto text-text-muted opacity-50">
                                <Zap size={32} />
                            </div>
                            <p className="text-text-muted font-medium">Your queue is empty. Start by dropping some photos.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Optimize;
