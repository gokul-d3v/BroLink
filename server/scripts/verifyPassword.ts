
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../src/models/User';

dotenv.config({ path: path.join(__dirname, '../.env') });

const verifyPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bento');
        console.log('Connected to MongoDB');

        const email = 'brototypemedia@gmail.com';
        const passwordToCheck = 'WidgetEdit@123';

        const user = await User.findOne({ email });

        if (!user) {
            console.log('User NOT found!');
            process.exit(1);
        }

        console.log(`User found: ${user.email}`);
        console.log(`Stored Hash: ${user.password}`);

        const isMatch = await bcrypt.compare(passwordToCheck, user.password);

        if (isMatch) {
            console.log('SUCCESS: Password matches hash.');
        } else {
            console.log('FAILURE: Password does NOT match hash.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
};

verifyPassword();
