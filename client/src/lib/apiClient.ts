import axios from 'axios';
import { auth } from './firebase';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
    timeout: 30000,
});

// Request interceptor — attach Firebase token to EVERY request
apiClient.interceptors.request.use(
    async (config) => {
        try {
            const user = auth.currentUser;

            if (user) {
                // Force refresh=false for speed, true only if token might be expired
                const token = await user.getIdToken(false);
                config.headers['Authorization'] = `Bearer ${token}`;
                // console.log('[apiClient] Token attached. User:', user.email);
            } else {
                console.warn('[apiClient] No Firebase user found when making request to:', config.url);
            }
        } catch (err) {
            console.error('[apiClient] Failed to get ID token:', err);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — handle auth errors
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status;
        const url = error.config?.url;

        if (status === 401) {
            console.error('[apiClient] 401 Unauthorized on:', url);
            // Try once with a fresh token
            try {
                const user = auth.currentUser;
                if (user) {
                    const freshToken = await user.getIdToken(true); // force refresh
                    error.config.headers['Authorization'] = `Bearer ${freshToken}`;
                    return axios(error.config); // retry once
                }
            } catch (retryErr) {
                console.error('[apiClient] Token refresh failed:', retryErr);
            }
        }

        if (status === 429) {
            console.warn('[apiClient] Rate limit hit on:', url);
        }

        return Promise.reject(error);
    }
);

export default apiClient;
