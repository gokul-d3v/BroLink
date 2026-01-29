import mongoose from 'mongoose';

const bentoConfigSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    username: { type: String, required: true, unique: true }, // Redundant but good for quick lookups
    widgets: [{
        id: { type: String, required: true },
        size: { type: String, required: true },
        url: { type: String, default: '' },
        customTitle: { type: String, default: '' },
        customImage: { type: String, default: '' },
        ctaText: { type: String, default: '' },
        imageFit: { type: String, default: 'cover' } // 'cover' or 'contain'
    }], // Explicit schema for widgets to ensure all fields are saved
    layouts: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

export const BentoConfig = mongoose.model('BentoConfig', bentoConfigSchema);
