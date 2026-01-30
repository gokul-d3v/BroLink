import mongoose from 'mongoose';

const widgetSchema = new mongoose.Schema({
    id: { type: String, required: true },
    size: { type: String, required: true },
    url: { type: String, default: '' },
    customTitle: { type: String, default: '' },
    customImage: { type: String, default: '' },
    ctaText: { type: String, default: '' },
    imageFit: { type: String, default: 'cover' }
}, { _id: false });

const bentoConfigSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    username: { type: String, required: true, unique: true },
    widgets: [widgetSchema],
    layouts: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

export const BentoConfig = mongoose.model('BentoConfig', bentoConfigSchema);
