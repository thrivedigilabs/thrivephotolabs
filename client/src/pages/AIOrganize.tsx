import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Sparkles, Upload, Trash2, Download, FileDown,
    Zap, CheckCircle, AlertCircle, RefreshCw, ChevronRight,
    Package, CheckSquare, Square, Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../lib/apiClient';
import { useTabStore } from '../store/tabStore';
import { useAuth } from '../hooks/useAuth';
import { QueueItem, AIOrganizeSuggestion, PLAN_LIMITS } from '../types';
import { DropZone } from '../components/ui/DropZone';

export const AIOrganize: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { optimize, setOptimize, showToast } = useTabStore();

    // State
    const [files, setFiles] = useState<File[]>([]);
    const [suggestions, setSuggestions] = useState<AIOrganizeSuggestion[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'analyzing' | 'ready' | 'error'>('idle');
    const [analyzeProgress, setAnalyzeProgress] = useState(0);
    const [analyzedCount, setAnalyzedCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [usageStats, setUsageStats] = useState({ aiBatchesUsed: 0 });

    const groupColorMap = useRef<Record<string, string>>({});

    // Fetch usage on mount
    useEffect(() => {
        const fetchUsage = async () => {
            try {
                const response = await apiClient.get('/api/usage/me');
                setUsageStats(response.data);
            } catch (error) {
                console.error('Failed to fetch usage stats', error);
            }
        };
        fetchUsage();
    }, []);

    const aiBatchesRemaining = React.useMemo(() => {
        if (!user) return 0;
        const limit = PLAN_LIMITS[user.plan].aiBatchesPerMonth;
        return Math.max(0, limit - usageStats.aiBatchesUsed);
    }, [user, usageStats]);

    const handleFilesSelected = (selectedFiles: File[]) => {
        setFiles(prev => [...prev, ...selectedFiles]);
        setAnalysisStatus('idle');
    };

    const startAnalysis = async () => {
        if (files.length === 0) return;

        setAnalysisStatus('analyzing');
        setAnalyzeProgress(0);
        setError(null);
        setAnalyzedCount(0);

        // Simulate progress while waiting for Gemini
        const progressInterval = setInterval(() => {
            setAnalyzeProgress(prev => {
                if (prev >= 85) {
                    clearInterval(progressInterval);
                    return 85; // Hold at 85% until real response
                }
                return prev + Math.random() * 8;
            });
        }, 600);

        try {
            const formData = new FormData();
            files.forEach(f => formData.append('images', f));

            const response = await apiClient.post<AIOrganizeSuggestion[]>('/api/gemini/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000, // 2 min timeout for large batches
            });

            clearInterval(progressInterval);
            setAnalyzeProgress(100);

            await new Promise(r => setTimeout(r, 400)); // Brief pause to show 100%

            const suggestionsData = response.data || [];
            setSuggestions(suggestionsData);
            // Select all by default
            setSelectedIds(new Set(suggestionsData.map((_, i) => i)));
            setAnalysisStatus('ready');
            setAnalyzeProgress(0);

            // Update usage stats after analysis
            const usageRes = await apiClient.get('/api/usage/me');
            setUsageStats(usageRes.data);

        } catch (err: any) {
            clearInterval(progressInterval);
            setAnalyzeProgress(0);
            setAnalysisStatus('error');
            setError(err.response?.data?.error || err.message || 'Analysis failed');
        }
    };

    // Helper functions
    const toggleSelect = (index: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const selectGroup = (groupLabel: string) => {
        const groupIndices = suggestions
            .map((s, i) => s.groupLabel === groupLabel ? i : -1)
            .filter(i => i !== -1);
        setSelectedIds(prev => {
            const next = new Set(prev);
            groupIndices.forEach(i => next.add(i));
            return next;
        });
    };

    const updateSuggestionName = (index: number, newName: string) => {
        setSuggestions(prev => prev.map((s, i) =>
            i === index ? { ...s, suggestedName: newName } : s
        ));
    };

    const GROUP_COLORS = [
        'bg-purple-500/15 text-purple-400',
        'bg-blue-500/15 text-blue-400',
        'bg-green-500/15 text-green-400',
        'bg-orange-500/15 text-orange-400',
        'bg-pink-500/15 text-pink-400',
        'bg-cyan-500/15 text-cyan-400',
        'bg-yellow-500/15 text-yellow-400',
        'bg-red-500/15 text-red-400',
    ];

    const getGroupColor = (groupId: string): string => {
        if (!groupColorMap.current[groupId]) {
            const usedCount = Object.keys(groupColorMap.current).length;
            groupColorMap.current[groupId] = GROUP_COLORS[usedCount % GROUP_COLORS.length];
        }
        return groupColorMap.current[groupId];
    };

    const handleClearAll = () => {
        setFiles([]);
        setSuggestions([]);
        setSelectedIds(new Set());
        setAnalysisStatus('idle');
        setAnalyzeProgress(0);
        setError(null);
        groupColorMap.current = {};
    };

    const downloadCSV = () => {
        const rows = [
            ['Original Filename', 'AI Suggested Name', 'Group'],
            ...suggestions.map(s => [files[s.originalIndex]?.name || '', s.suggestedName, s.groupLabel])
        ];
        const csv = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-organize-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const downloadSelected = async () => {
        const selectedSuggestions = suggestions.filter((_, i) => selectedIds.has(i));

        if (selectedSuggestions.length === 0) return;

        if (selectedSuggestions.length === 1) {
            const suggestion = selectedSuggestions[0];
            const file = files[suggestion.originalIndex];
            if (!file) return;

            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url;
            a.download = suggestion.suggestedName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return;
        }

        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        for (const suggestion of selectedSuggestions) {
            const file = files[suggestion.originalIndex];
            if (!file) continue;

            const arrayBuffer = await file.arrayBuffer();
            zip.file(suggestion.suggestedName, arrayBuffer);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-organized-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`Downloaded ${selectedSuggestions.length} files with AI names`, 'success');
    };

    const sendToOptimize = () => {
        const selectedFiles = suggestions
            .filter((_, i) => selectedIds.has(i))
            .map((suggestion) => {
                const file = files[suggestion.originalIndex];
                if (!file) return null;
                return new File([file], suggestion.suggestedName, { type: file.type });
            })
            .filter(Boolean) as File[];

        if (selectedFiles.length === 0) return;

        const newItems: QueueItem[] = selectedFiles.map(f => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            file: f,
            status: 'pending' as const,
            outputName: f.name.replace(/\.[^/.]+$/, '') + '.webp',
            originalSize: f.size,
        }));

        setOptimize({ queue: [...optimize.queue, ...newItems] });
        navigate('/optimize');
        showToast(`${selectedFiles.length} images sent to Optimize tab`, 'success');
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">AI Smart Organize</h1>
                <p className="text-text-secondary">Let Gemini name and group your product shots for SEO optimization.</p>
            </div>

            {/* Top Section — File Drop Zone */}
            <div className="space-y-4">
                <DropZone
                    onFilesSelected={handleFilesSelected}
                    fileCount={files.length}
                />

                <div className="flex items-center justify-between px-2">
                    <p className="text-xs text-text-muted font-medium">
                        ⚡ Uses 1 AI Batch per analysis run. You have {aiBatchesRemaining} batches remaining.
                    </p>
                    <button
                        onClick={startAnalysis}
                        disabled={files.length === 0 || analysisStatus === 'analyzing'}
                        className="flex items-center gap-2 px-8 py-3 bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold rounded-xl transition-all shadow-xl shadow-white/5"
                    >
                        {analysisStatus === 'analyzing' ? (
                            <RefreshCw className="animate-spin" size={20} />
                        ) : (
                            <Brain size={20} />
                        )}
                        Analyze with AI
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {/* Stats Strip */}
                {(analysisStatus === 'analyzing' || analysisStatus === 'ready') && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 px-4 py-3 bg-bg-card border border-bg-border rounded-xl flex-wrap shadow-lg"
                    >
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-text-muted">Total:</span>
                            <span className="font-semibold text-white">{files.length}</span>
                        </div>

                        <div className="w-px h-4 bg-bg-border" />

                        <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full bg-success" />
                            <span className="text-text-muted">Analyzed:</span>
                            <span className="font-semibold text-success">
                                {analysisStatus === 'ready' ? suggestions.length : analyzedCount}
                            </span>
                        </div>

                        <div className="w-px h-4 bg-bg-border" />

                        {analysisStatus === 'ready' && (
                            <>
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-accent" />
                                    <span className="text-text-muted">Groups:</span>
                                    <span className="font-semibold text-accent">
                                        {new Set(suggestions.map(s => s.groupId)).size}
                                    </span>
                                </div>
                                <div className="w-px h-4 bg-bg-border" />
                            </>
                        )}

                        {analysisStatus === 'ready' && (
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 rounded-full bg-warning" />
                                <span className="text-text-muted">Selected:</span>
                                <span className="font-semibold text-warning">{selectedIds.size}</span>
                            </div>
                        )}

                        <div className="flex-1" />

                        <button
                            onClick={handleClearAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-danger/40 text-danger text-xs hover:bg-danger/10 transition-colors"
                        >
                            <Trash2 size={12} />
                            Clear All
                        </button>
                    </motion.div>
                )}

                {/* Loading State */}
                {analysisStatus === 'analyzing' && (
                    <motion.div
                        key="analyzing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-16 gap-6"
                    >
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 rounded-full border-4 border-bg-border" />
                            <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles size={24} className="text-accent" />
                            </div>
                        </div>

                        <div className="text-center">
                            <p className="text-white font-semibold text-lg">Gemini is analyzing your images</p>
                            <p className="text-text-secondary text-sm mt-1">
                                Processing {files.length} image{files.length !== 1 ? 's' : ''}...
                            </p>
                        </div>

                        <div className="w-80 max-w-full">
                            <div className="h-1.5 bg-bg-border rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-accent rounded-full transition-all duration-500"
                                    style={{ width: `${analyzeProgress}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-1">
                                <span className="text-xs text-text-muted">Sending to Gemini...</span>
                                <span className="text-xs text-accent">{Math.round(analyzeProgress)}%</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 w-80 max-w-full">
                            {[
                                { label: 'Reading image data', done: analyzeProgress > 20 },
                                { label: 'Sending to Gemini AI', done: analyzeProgress > 50 },
                                { label: 'Generating SEO filenames', done: analyzeProgress > 70 },
                                { label: 'Grouping similar products', done: analyzeProgress > 90 },
                            ].map((step, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                    {step.done ? (
                                        <CheckCircle size={14} className="text-success shrink-0" />
                                    ) : analyzeProgress > i * 25 ? (
                                        <div className="w-3.5 h-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
                                    ) : (
                                        <div className="w-3.5 h-3.5 rounded-full border-2 border-bg-border shrink-0" />
                                    )}
                                    <span className={step.done ? 'text-white' : analyzeProgress > i * 25 ? 'text-accent' : 'text-text-muted'}>
                                        {step.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Ready State */}
                {analysisStatus === 'ready' && suggestions.length > 0 && (
                    <motion.div
                        key="ready"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col gap-4"
                    >
                        {/* Toolbar */}
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSelectedIds(new Set(suggestions.map((_, i) => i)))}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-bg-border text-text-secondary hover:border-accent hover:text-accent transition-colors"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-bg-border text-text-secondary hover:border-accent hover:text-accent transition-colors"
                                >
                                    Deselect All
                                </button>

                                <div className="flex items-center gap-1 ml-2 flex-wrap">
                                    {Array.from(new Set(suggestions.map(s => s.groupLabel))).map(group => (
                                        <button
                                            key={group}
                                            onClick={() => selectGroup(group)}
                                            className="text-[11px] px-2 py-1 rounded-md bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
                                        >
                                            {group}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={downloadSelected}
                                    disabled={selectedIds.size === 0}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 border border-success/30 text-success text-sm hover:bg-success/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Download size={14} />
                                    Download Selected ({selectedIds.size})
                                </button>

                                <button
                                    onClick={downloadCSV}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-bg-border text-text-secondary text-sm hover:border-accent hover:text-accent transition-colors"
                                >
                                    <FileDown size={14} />
                                    Export CSV
                                </button>

                                <button
                                    onClick={sendToOptimize}
                                    disabled={selectedIds.size === 0}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Zap size={14} />
                                    Send to Optimize ({selectedIds.size})
                                </button>
                            </div>
                        </div>

                        {/* Results Table */}
                        <div className="bg-bg-card border border-bg-border rounded-xl overflow-hidden shadow-2xl">
                            <div className="grid gap-4 px-4 py-3 border-b border-bg-border text-xs uppercase tracking-wider text-text-muted bg-bg-border/20"
                                style={{ gridTemplateColumns: '40px 56px 1fr 1fr 120px' }}>
                                <div className="flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === suggestions.length && suggestions.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedIds(new Set(suggestions.map((_, i) => i)));
                                            else setSelectedIds(new Set());
                                        }}
                                        className="accent-accent w-4 h-4 cursor-pointer"
                                    />
                                </div>
                                <div>Preview</div>
                                <div>Original Filename</div>
                                <div>AI Suggested Name</div>
                                <div>Group</div>
                            </div>

                            <div className="divide-y divide-bg-border max-h-[600px] overflow-y-auto custom-scrollbar">
                                {suggestions.map((suggestion, index) => {
                                    const file = files[suggestion.originalIndex];
                                    const previewUrl = file ? URL.createObjectURL(file) : null;
                                    const isSelected = selectedIds.has(index);

                                    return (
                                        <div
                                            key={index}
                                            onClick={() => toggleSelect(index)}
                                            className={`grid gap-4 px-4 py-3 items-center cursor-pointer transition-colors ${isSelected ? 'bg-accent/5 hover:bg-accent/8' : 'hover:bg-bg-border/50'
                                                }`}
                                            style={{ gridTemplateColumns: '40px 56px 1fr 1fr 120px' }}
                                        >
                                            <div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(index)}
                                                    className="accent-accent w-4 h-4 cursor-pointer"
                                                />
                                            </div>

                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-bg-border shrink-0 shadow-md">
                                                {previewUrl && (
                                                    <img
                                                        src={previewUrl}
                                                        alt={file?.name}
                                                        className="w-full h-full object-cover"
                                                        onLoad={() => previewUrl && URL.revokeObjectURL(previewUrl)}
                                                    />
                                                )}
                                            </div>

                                            <div className="min-w-0">
                                                <p className="text-sm text-text-secondary truncate" title={file?.name}>
                                                    {file?.name}
                                                </p>
                                            </div>

                                            <div onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="text"
                                                    value={suggestion.suggestedName}
                                                    onChange={(e) => updateSuggestionName(index, e.target.value)}
                                                    className="w-full bg-bg border border-bg-border rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-accent transition-colors"
                                                />
                                            </div>

                                            <div>
                                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getGroupColor(suggestion.groupId)}`}>
                                                    {suggestion.groupLabel}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Error State */}
                {analysisStatus === 'error' && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-20 bg-danger/5 border border-danger/20 border-dashed rounded-3xl"
                    >
                        <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mb-6">
                            <AlertCircle className="text-danger" size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Analysis Error</h3>
                        <p className="text-text-secondary text-center max-w-md mb-8">
                            {error}
                        </p>
                        <button
                            onClick={startAnalysis}
                            className="px-8 py-2.5 bg-danger text-white font-bold rounded-xl hover:bg-danger/90 transition-all shadow-lg shadow-danger/10 flex items-center gap-2"
                        >
                            <RefreshCw size={18} />
                            Try Again
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AIOrganize;
