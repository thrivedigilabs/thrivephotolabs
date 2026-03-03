import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { motion } from 'framer-motion';

interface DropZoneProps {
    onFilesSelected: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
    label?: string;
    sublabel?: string;
    fileCount?: number;
}

export const DropZone: React.FC<DropZoneProps> = ({
    onFilesSelected,
    accept = 'image/*',
    multiple = true,
    label = 'Drop images here or click to browse',
    sublabel = 'Supports JPG, PNG, WEBP, and more',
    fileCount = 0,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
            onFilesSelected(Array.from(e.dataTransfer.files));
        }
    };

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(Array.from(e.target.files));
        }
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
        border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all relative overflow-hidden
        ${isDragging
                    ? 'border-accent bg-accent/5 ring-4 ring-accent/10 shadow-lg shadow-accent-glow/20'
                    : 'border-bg-border bg-bg/50 hover:border-accent/40 hover:bg-bg-border/20 shadow-xl'
                }
      `}
        >
            <input
                type="file"
                ref={fileInputRef}
                multiple={multiple}
                accept={accept}
                hidden
                onChange={onFileSelect}
            />

            <div className={`
        w-16 h-16 rounded-2xl flex items-center justify-center transition-all 
        ${isDragging ? 'bg-accent text-white scale-110 rotate-3' : 'bg-bg-border/50 text-text-secondary'}
      `}>
                <Upload size={32} />
            </div>

            <div className="text-center z-10 transition-transform">
                <p className="text-lg font-bold text-text-primary tracking-tight">{label}</p>
                <p className="text-sm text-text-muted mt-1 font-medium">{sublabel}</p>
            </div>

            {fileCount > 0 && (
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mt-2 px-4 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-xs font-bold text-accent"
                >
                    {fileCount} images selected
                </motion.div>
            )}

            {isDragging && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-accent/5 pointer-events-none flex items-center justify-center"
                >
                    <div className="px-6 py-2 bg-accent text-white rounded-full text-xs font-bold shadow-2xl shadow-accent-glow animate-pulse">
                        Drop it like it's hot!
                    </div>
                </motion.div>
            )}
        </div>
    );
};
