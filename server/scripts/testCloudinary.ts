import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly
const envPath = path.join(__dirname, '../.env');
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

console.log('Checking Cloudinary Config:');
console.log(`Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing'}`);
console.log(`API Key: ${process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`API Secret: ${process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing'}`);

// Configure
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const testConnection = async () => {
    try {
        console.log('\nTesting connection by verifying credentials...');
        const result = await cloudinary.api.ping();
        console.log('✅ Cloudinary Connection Successful!');
        console.log('Response:', result);
    } catch (error: any) {
        console.error('❌ Cloudinary Connection Failed!');
        console.error('Error:', error.message || error);

        if (error.http_code === 401) {
            console.log('\n💡 Hint: Check if your API Key and Secret are correct.');
        } else if (error.message && error.message.includes('Must supply cloud_name')) {
            console.log('\n💡 Hint: Cloud Name is missing or undefined.');
        }
    }
};

testConnection();
