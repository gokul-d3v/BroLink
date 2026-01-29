import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { BentoConfig } from '../src/models/BentoConfig';

dotenv.config({ path: path.join(__dirname, '../.env') });

const viewWidgetDetails = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bento');
        console.log('Connected to MongoDB\n');

        const config = await BentoConfig.findOne({ username: 'brototype' });

        if (!config) {
            console.log('❌ No BentoConfig found for brototype');
            return;
        }

        console.log('📋 Widget Details for brototype:');
        console.log('================================');

        const widgets = typeof config.widgets === 'string'
            ? JSON.parse(config.widgets)
            : config.widgets;

        widgets.forEach((w: any, index: number) => {
            console.log(`\nWidget #${index + 1} (ID: ${w.id})`);
            console.log(`   Title: ${w.customTitle || '(No custom title)'}`);
            console.log(`   URL:   ${w.url}`);
            console.log(`   Size:  ${w.size}`);
            console.log(`   CTA:   ${w.ctaText || '(Default)'}`);
            console.log(`   Image: ${w.customImage ? '✅ Yes' : '❌ No'}`);
        });

        console.log('\n================================');
        console.log('Layouts stored:');
        const layouts = typeof config.layouts === 'string'
            ? JSON.parse(config.layouts)
            : config.layouts;

        Object.keys(layouts).forEach(bp => {
            console.log(`   ${bp}: ${layouts[bp].length} items`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

viewWidgetDetails();
