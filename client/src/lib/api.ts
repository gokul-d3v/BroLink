import axios from 'axios';

const getBaseUrl = () => {
    // If explicitly set in env (e.g. locally), use it
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // Fallback logic: 
    // If we are on localhost, default to localhost:5000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
    }

    // Otherwise (on Vercel/Production), default to the live Render server
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
