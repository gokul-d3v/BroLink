import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

router.post('/', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ message: 'URL is required' });
    }

    try {
        // Fetch the HTML content
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 5000 // 5 second timeout
        });

        const $ = cheerio.load(data);

        // Extract metadata
        const metadata = {
            title: $('meta[property="og:title"]').attr('content') || $('title').text() || '',
            description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '',
            image: $('meta[property="og:image"]').attr('content') || '',
            favicon: $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href') || '',
            url: url,
            domain: new URL(url).hostname
        };

        // Normalize favicon if relative URL
        if (metadata.favicon && !metadata.favicon.startsWith('http')) {
            const origin = new URL(url).origin;
            metadata.favicon = new URL(metadata.favicon, origin).href;
        }

        res.json(metadata);

    } catch (error: any) {
        console.error('Metadata fetch error:', error.message);
        // Fallback or error
        res.status(500).json({ message: 'Failed to fetch metadata' });
    }
});

export default router;
