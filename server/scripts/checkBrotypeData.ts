import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../src/models/User';
import { BentoConfig } from '../src/models/BentoConfig';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkBrotypeData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bento');
        console.log('Connected to MongoDB\n');

        // Check User
        const user = await User.findOne({ email: 'brototypemedia@gmail.com' });
        if (!user) {
            console.log('❌ User NOT found!');
            process.exit(1);
        }
        console.log('✅ User found:');
        console.log(`   - Username: ${user.username}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Role: ${user.role}`);
        console.log(`   - ID: ${user._id}\n`);

        // Check BentoConfig
        const config = await BentoConfig.findOne({ username: user.username });
        if (!config) {
            console.log('❌ BentoConfig NOT found for username:', user.username);
            console.log('   This is why the public page shows "User not found"\n');
        } else {
            console.log('✅ BentoConfig found:');
            console.log(`   - Username: ${config.username}`);
            console.log(`   - Widgets count: ${config.widgets?.length || 0}`);
            console.log(`   - Has layouts: ${Object.keys(config.layouts || {}).length > 0}\n`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Check failed:', error);
        process.exit(1);
    }
};

checkBrotypeData();
