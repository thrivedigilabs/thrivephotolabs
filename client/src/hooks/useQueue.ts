import { useRef } from 'react';
import JSZip from 'jszip';
import { useTabStore } from '../store/tabStore';
import { compressBlob } from '../lib/compressBlob';
import apiClient from '../lib/apiClient';
import { QueueItem } from '../types';

export function useQueue() {
    const isProcessing = useRef(false);
    const abortRef = useRef(false);

    const { optimize, setOptimize, updateQueueItem } = useTabStore();
    const sessionIdRef = useRef<string | null>(null);

    const logDownload = async (item: QueueItem) => {
        try {
            await apiClient.post('/api/usage/log-download', {
                filename: item.outputName,
                originalSize: item.originalSize,
                finalSize: item.finalSize,
                sessionId: sessionIdRef.current
            });
            window.dispatchEvent(new CustomEvent('refresh-usage'));
        } catch (err) {
            console.error('Failed to log download', err);
        }
    };

    const addFiles = (files: File[]) => {
        const newItems: QueueItem[] = files.map((file) => ({
            id: Math.random().toString(36).substring(7),
            file,
            status: 'pending',
            originalSize: file.size,
            outputName: file.name.replace(/\.[^/.]+$/, "") + ".webp",
        }));

        setOptimize({
            queue: [...optimize.queue, ...newItems],
        });
    };

    const startProcessing = async () => {
        if (isProcessing.current) return;

        isProcessing.current = true;
        abortRef.current = false;
        sessionIdRef.current = Math.random().toString(36).substring(2, 10);
        setOptimize({ isProcessing: true });

        const queue = optimize.queue;

        for (const item of queue) {
            if (abortRef.current) break;
            if (item.status !== 'pending') continue;

            updateQueueItem(item.id, { status: 'processing' });

            try {
                const { blob, finalWidth, finalHeight } = await compressBlob(
                    item.file,
                    optimize.outputWidth,
                    optimize.outputHeight,
                    optimize.bgColor
                );

                const baseName = item.file.name.replace(/\.[^/.]+$/, "");
                const outputName = `${baseName}.webp`;

                updateQueueItem(item.id, {
                    status: 'done',
                    outputBlob: blob,
                    outputName,
                    finalSize: blob.size,
                });

                // Increment usage and refresh header
                apiClient.post('/api/usage/increment', { count: 1 })
                    .then(() => window.dispatchEvent(new CustomEvent('refresh-usage')))
                    .catch(console.error);

            } catch (error: any) {
                updateQueueItem(item.id, {
                    status: 'error',
                    error: error.message || 'Compression failed',
                });
            }
        }

        isProcessing.current = false;
        setOptimize({ isProcessing: false });
    };

    const cancelProcessing = () => {
        abortRef.current = true;
        setOptimize({ isProcessing: false });
        isProcessing.current = false;
    };

    const downloadAll = async () => {
        const zip = new JSZip();
        const completedItems = optimize.queue.filter(item => item.status === 'done' && item.outputBlob);

        if (completedItems.length === 0) return;

        for (const item of completedItems) {
            zip.file(item.outputName || `${item.id}.webp`, item.outputBlob!);
            await logDownload(item);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thrivephotolabs-optimized-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const clearQueue = () => {
        setOptimize({ queue: [] });
    };

    return { addFiles, startProcessing, cancelProcessing, downloadAll, clearQueue, logDownload };
}
