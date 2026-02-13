import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from './src/models/User';
import { BentoConfig } from './src/models/BentoConfig';

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bento');
        console.log('Connected to MongoDB');

        // check if admin exists
        let admin = await User.findOne({ username: 'superadmin' });

        if (!admin) {
            console.log('Creating user "superadmin"...');
            const hashedPassword = await bcrypt.hash('password123', 10);
            admin = await User.create({
                username: 'superadmin',
                full_name: 'Super Admin',
                email: 'admin@brototype.com',
                password: hashedPassword,
                role: 'super-admin'
            });
            console.log('Admin created:', admin._id);
        } else {
            console.log('User "superadmin" already exists.');
        }

        // check/create config for admin (so they can login without errors)
        let config = await BentoConfig.findOne({ username: 'superadmin' });
        if (!config) {
            console.log('Creating BentoConfig for "superadmin"...');
            config = await BentoConfig.create({
                user: admin._id,
                username: 'superadmin',
                widgets: [
                    {
                        id: 'admin-welcome',
                        size: '2x1',
                        url: '#',
                        customTitle: 'Admin Dashboard',
                        customImage: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=2070&ixlib=rb-4.0.3',
                        ctaText: 'System Status',
                        imageFit: 'cover'
                    }
                ],
                layouts: {
                    lg: [
                        { i: 'admin-welcome', x: 0, y: 0, w: 2, h: 1 }
                    ]
                }
            });
            console.log('BentoConfig created for admin');
        } else {
            console.log('BentoConfig for admin already exists.');
        }

        console.log('Admin verification/seeding complete!');

    } catch (error) {
        console.error('Seeding error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

seedAdmin();
