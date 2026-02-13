import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from './src/models/User';
import { BentoConfig } from './src/models/BentoConfig';

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bento');
        console.log('Connected to MongoDB');

        // check if user exists
        let user = await User.findOne({ username: 'brototype' });

        if (!user) {
            console.log('Creating user "brototype"...');
            const hashedPassword = await bcrypt.hash('password123', 10);
            user = await User.create({
                username: 'brototype',
                full_name: 'Brototype',
                email: 'brototype@example.com',
                password: hashedPassword
            });
            console.log('User created:', user._id);
        } else {
            console.log('User "brototype" already exists.');
        }

        // check/create config
        let config = await BentoConfig.findOne({ username: 'brototype' });
        if (!config) {
            console.log('Creating BentoConfig for "brototype"...');
            config = await BentoConfig.create({
                user: user._id,
                username: 'brototype',
                widgets: [
                    {
                        id: 'welcome',
                        size: '2x1',
                        url: 'https://brototype.com',
                        customTitle: 'Welcome to Brototype',
                        customImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2070&ixlib=rb-4.0.3',
                        ctaText: 'Visit Website',
                        imageFit: 'cover'
                    }
                ],
                layouts: {
                    lg: [
                        { i: 'welcome', x: 0, y: 0, w: 2, h: 1 }
                    ]
                }
            });
            console.log('BentoConfig created');
        } else {
            console.log('BentoConfig already exists.');
        }

        console.log('Seeding complete!');

    } catch (error) {
        console.error('Seeding error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

seedData();
