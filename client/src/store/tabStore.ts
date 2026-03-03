import { create } from 'zustand';
import { QueueItem, AIOrganizeSuggestion } from '../types';

interface OptimizeTabState {
    queue: QueueItem[];
    outputWidth: number;
    outputHeight: number;
    isProcessing: boolean;
    bgColor: string;
}

interface AIOrganizeTabState {
    files: File[];
    suggestions: AIOrganizeSuggestion[];
    analysisStatus: 'idle' | 'analyzing' | 'ready' | 'error';
    error: string | null;
}

export interface DriveFile {
    id: string;
    name: string;
    thumbnailLink: string;
    size: string;
}

interface DriveTabState {
    sourceFolderUrl: string;
    destFolderUrl: string;
    fetchedImages: DriveFile[];
    isFetching: boolean;
    isConnected: boolean;
    connectedEmail: string | null;
}

export interface ToastMessage {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

interface TabStore {
    optimize: OptimizeTabState;
    aiOrganize: AIOrganizeTabState;
    drive: DriveTabState;
    toasts: ToastMessage[];
    setOptimize: (patch: Partial<OptimizeTabState>) => void;
    setAIOrganize: (patch: Partial<AIOrganizeTabState>) => void;
    setDrive: (patch: Partial<DriveTabState>) => void;
    updateQueueItem: (id: string, patch: Partial<QueueItem>) => void;
    resetOptimizeQueue: () => void;
    showToast: (message: string, type: ToastMessage['type']) => void;
    hideToast: (id: string) => void;
}

export const useTabStore = create<TabStore>((set) => ({
    optimize: {
        queue: [],
        outputWidth: 1000,
        outputHeight: 1000,
        isProcessing: false,
        bgColor: '#FFFFFF',
    },
    aiOrganize: {
        files: [],
        suggestions: [],
        analysisStatus: 'idle',
        error: null,
    },
    drive: {
        sourceFolderUrl: '',
        destFolderUrl: '',
        fetchedImages: [],
        isFetching: false,
        isConnected: false,
        connectedEmail: null,
    },
    toasts: [],
    setOptimize: (patch) =>
        set((state) => ({ optimize: { ...state.optimize, ...patch } })),
    setAIOrganize: (patch) =>
        set((state) => ({ aiOrganize: { ...state.aiOrganize, ...patch } })),
    setDrive: (patch) =>
        set((state) => ({ drive: { ...state.drive, ...patch } })),
    updateQueueItem: (id, patch) =>
        set((state) => ({
            optimize: {
                ...state.optimize,
                queue: state.optimize.queue.map((item) =>
                    item.id === id ? { ...item, ...patch } : item
                ),
            },
        })),
    resetOptimizeQueue: () =>
        set((state) => ({
            optimize: { ...state.optimize, queue: [] },
        })),
    showToast: (message, type) => {
        const id = Math.random().toString(36).substring(7);
        set((state) => ({
            toasts: [...state.toasts, { id, message, type }]
        }));
        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter(t => t.id !== id)
            }));
        }, 4000);
    },
    hideToast: (id) => set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
    })),
}));
