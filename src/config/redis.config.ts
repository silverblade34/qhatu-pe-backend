import { CacheModuleOptions } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

export const redisConfig = async (): Promise<CacheModuleOptions> => {
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD;
  const redisDb = parseInt(process.env.REDIS_DB || '0', 10);
  const redisTtl = parseInt(process.env.REDIS_TTL || '3600', 10);

  console.log('Redis Config:', {
    host: redisHost,
    port: redisPort,
    db: redisDb,
    hasPassword: !!redisPassword,
  });

  try {
    return {
      store: await redisStore({
        socket: {
          host: redisHost,
          port: redisPort,
        },
        ...(redisPassword && { password: redisPassword }),
        database: redisDb,
        ttl: redisTtl * 1000,
      }),
      isGlobal: true,
    };
  } catch (error) {
    console.error('Error al configurar Redis:', error);
    throw error;
  }
};

export default redisConfig;