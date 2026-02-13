import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'bento-widgets', // Folder name in Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
        transformation: [{ width: 1000, crop: "limit" }] // Optimization
    } as any // bypass type check for folder/allowed_formats
});

const upload = multer({ storage: storage });

// Single file upload route
router.post('/', authMiddleware, upload.single('file'), (req: any, res: any) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    // Cloudinary returns the URL in req.file.path
    const fileUrl = req.file.path;

    res.json({
        message: 'File uploaded successfully',
        url: fileUrl,
        filename: req.file.filename
    });
});

// Delete file route
router.post('/delete', authMiddleware, async (req: any, res: any) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ message: 'No URL provided' });
    }

    try {
        // Extract public_id from Cloudinary URL
        // URL format: .../upload/v1234/folder/filename.ext or .../upload/folder/filename.ext
        // We need 'folder/filename' (without extension)
        const parts = url.split('/');
        const filename = parts.pop();
        const folder = parts.pop();

        if (!filename || !folder) {
            return res.status(400).json({ message: 'Invalid URL format' });
        }

        const publicId = `${folder}/${filename.split('.')[0]}`;

        await cloudinary.uploader.destroy(publicId);
        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ message: 'Failed to delete image' });
    }
});

export default router;
