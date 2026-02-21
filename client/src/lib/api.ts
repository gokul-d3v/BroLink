import axios from 'axios';

const getBaseUrl = () => {
    // Primary source: explicit frontend env var for Go backend URL.
    const envApiUrl = import.meta.env.VITE_API_URL;
    if (envApiUrl && envApiUrl.trim().length > 0) {
        return envApiUrl.trim();
    }

    // Local fallback for development.
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
    }

    // If frontend and backend are deployed under same origin/reverse proxy.
    return `${window.location.origin}/api`;
};

const baseUrl = getBaseUrl();
console.log('🔌 API Base URL:', baseUrl, '| Hostname:', window.location.hostname);

const api = axios.create({
    baseURL: baseUrl,
});

// Add a request interceptor to attach the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
