import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/User';
import { BentoConfig } from './src/models/BentoConfig';

dotenv.config();

const checkBrototype = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bento');
        console.log('Connected to MongoDB');

        const user = await User.findOne({ username: 'brototype' });
        if (user) {
            console.log('User "brototype" found:', user._id);
            const config = await BentoConfig.findOne({ username: 'brototype' });
            if (config) {
                console.log('BentoConfig for "brototype" found:', config._id);
            } else {
                console.log('BentoConfig for "brototype" NOT found.');
            }
        } else {
            console.log('User "brototype" NOT found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkBrototype();
