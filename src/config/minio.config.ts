import { registerAs } from '@nestjs/config';

export default registerAs('minio', () => ({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    publicUrl: process.env.S3_PUBLIC_URL || 'http://localhost:9000',
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
}));