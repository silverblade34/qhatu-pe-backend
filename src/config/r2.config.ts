import { S3Client } from '@aws-sdk/client-s3';
import { registerAs } from '@nestjs/config';

export default registerAs('r2', () => {
  const config = {
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
    buckets: {
      avatars: {
        name: process.env.R2_BUCKET_AVATARS || 'qhatupe-avatars',
        publicUrl: process.env.R2_PUBLIC_URL_AVATARS || 'https://cdn.qhatupe.com',
      },
      products: {
        name: process.env.R2_BUCKET_MEDIA || 'qhatupe-media',
        publicUrl: process.env.R2_PUBLIC_URL_MEDIA || 'https://media.qhatupe.com',
      },
      banners: {
        name: process.env.R2_BUCKET_MEDIA || 'qhatupe-media',
        publicUrl: process.env.R2_PUBLIC_URL_MEDIA || 'https://media.qhatupe.com',
      },
      favicons: {
        name: process.env.R2_BUCKET_MEDIA || 'qhatupe-media',
        publicUrl: process.env.R2_PUBLIC_URL_MEDIA || 'https://media.qhatupe.com',
      },
    },
  };
  return config;
});

// Cliente S3 configurado para Cloudflare R2
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
  forcePathStyle: false,
});