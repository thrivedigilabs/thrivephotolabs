export type Plan = 'free' | 'creator' | 'studio' | 'agency';

export interface User {
    uid: string;
    email: string;
    emailVerified: boolean;
    plan: Plan;
    isAdmin: boolean;
}

export interface PlanLimits {
    aiBatchesPerMonth: number;
    imagesPerMonth: number;
    label: string;
    priceINR: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
    free: { label: 'Free', aiBatchesPerMonth: 3, imagesPerMonth: 50, priceINR: 0 },
    creator: { label: 'Creator', aiBatchesPerMonth: 20, imagesPerMonth: 500, priceINR: 999 },
    studio: { label: 'Studio', aiBatchesPerMonth: 100, imagesPerMonth: 2000, priceINR: 2999 },
    agency: { label: 'Agency', aiBatchesPerMonth: 999, imagesPerMonth: 10000, priceINR: 7999 },
};

export interface QueueItem {
    id: string;
    file: File;
    status: 'pending' | 'processing' | 'done' | 'error';
    outputBlob?: Blob;
    outputName: string;
    originalSize: number;
    finalSize?: number;
    error?: string;
}

export interface AIOrganizeSuggestion {
    originalIndex: number;
    suggestedName: string;
    groupId: string;
    groupLabel: string;
}

export interface UsageStats {
    uid: string;
    month: string;
    imagesProcessed: number;
    imagesDownloaded: number;
    aiBatchesUsed: number;
    extraCredits: number;
}

export interface CreditPack {
    id: string;
    images: number;
    priceINR: number;
    label: string;
}

export const CREDIT_PACKS_BY_PLAN: Record<string, CreditPack[]> = {
    free: [
        { id: 'free_50', images: 50, priceINR: 149, label: '50 Images' },
        { id: 'free_150', images: 150, priceINR: 399, label: '150 Images' },
        { id: 'free_500', images: 500, priceINR: 999, label: '500 Images' },
    ],
    creator: [
        { id: 'creator_200', images: 200, priceINR: 399, label: '200 Images' },
        { id: 'creator_500', images: 500, priceINR: 799, label: '500 Images' },
        { id: 'creator_1500', images: 1500, priceINR: 1999, label: '1500 Images' },
    ],
    studio: [
        { id: 'studio_500', images: 500, priceINR: 599, label: '500 Images' },
        { id: 'studio_2000', images: 2000, priceINR: 1799, label: '2000 Images' },
        { id: 'studio_5000', images: 5000, priceINR: 3999, label: '5000 Images' },
    ],
    agency: [
        { id: 'agency_1000', images: 1000, priceINR: 699, label: '1000 Images' },
        { id: 'agency_5000', images: 5000, priceINR: 2499, label: '5000 Images' },
        { id: 'agency_15000', images: 15000, priceINR: 5999, label: '15000 Images' },
    ],
};
