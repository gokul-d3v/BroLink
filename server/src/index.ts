import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';


import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes';
import bentoRoutes from './routes/bento.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
        'https://bro-link.vercel.app',
        'http://localhost:5173',
        process.env.CLIENT_URL || ''
    ].filter(Boolean),
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bento')
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bento', bentoRoutes);

import uploadRoutes from './routes/upload.routes';
app.use('/uploads', express.static('uploads'));
app.use('/api/upload', uploadRoutes);



app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
