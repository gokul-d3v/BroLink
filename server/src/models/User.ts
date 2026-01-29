import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed
    full_name: { type: String },
    avatar_url: { type: String, default: '' },
    role: { type: String, enum: ['user', 'super-admin'], default: 'user' },
    is_blocked: { type: Boolean, default: false },
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
