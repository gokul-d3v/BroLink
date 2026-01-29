
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../src/models/User';
import { BentoConfig } from '../src/models/BentoConfig';

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bento');
        console.log('Connected to MongoDB');

        const email = 'brototypemedia@gmail.com';
        const password = 'WidgetEdit@123';
        const hashedPassword = await bcrypt.hash(password, 10);
        const username = 'brototypemedia'; // Derived from email part

        let user = await User.findOne({ email });

        if (!user) {
            console.log('User does not exist, creating...');
            user = new User({
                username: username,
                email: email,
                password: hashedPassword,
                full_name: 'Brototype Media',
                role: 'user'
            });
            await user.save();
            console.log('User created.');
        } else {
            console.log('User exists. Updating password...');
            user.password = hashedPassword;
            await user.save();
            console.log('User password updated.');
        }

        // Ensure BentoConfig exists
        let config = await BentoConfig.findOne({ user: user._id });
        if (!config) {
            console.log('Creating default BentoConfig...');
            config = new BentoConfig({
                user: user._id,
                username: user.username,
                widgets: [], // Empty initially
                layouts: { lg: [] }
            });
            await config.save();
            console.log('Default BentoConfig created.');
        } else {
            console.log('BentoConfig already exists.');
        }

        console.log('Seeding completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedUser();
