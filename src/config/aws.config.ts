import { registerAs } from '@nestjs/config';

export default registerAs('aws', () => ({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  s3: {
    bucket: process.env.S3_BUCKET_NAME,
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
  },
  ses: {
    fromEmail: process.env.SES_FROM_EMAIL || 'noreply@qhatu.pe',
    region: process.env.SES_REGION || 'us-east-1',
  },
}));