import axios from 'axios';

const getBaseUrl = () => {
    // 1. If running on Localhost, prioritize Env var or default to local backend.
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    }

    // 2. If running on Vercel (or any non-local domain), FORCE the production backend.
    // This ignores any incorrect VITE_API_URL that might have leaked into the build.
    return 'https://brolink-2.onrender.com/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
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
