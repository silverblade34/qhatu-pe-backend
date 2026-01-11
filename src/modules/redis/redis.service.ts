import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  async onModuleInit() {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB || '0', 10),
    });

    this.client.on('error', (err) => console.error('Redis Client Error:', err));
    this.client.on('connect', () => console.log('Redis Client conectado'));

    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): RedisClientType {
    return this.client;
  }

  // FIX: Redis devuelve string | null, pero el tipo es genérico
  async get(key: string): Promise<string | null> {
    const value = await this.client.get(key);
    return value as string | null;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  // FIX: cursor debe ser string (no number)
  async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const result = await this.client.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      
      cursor = result.cursor.toString();
      keys.push(...result.keys);
    } while (cursor !== '0');

    return keys;
  }

  // BONUS: Método para eliminar múltiples keys eficientemente
  async delMany(keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  // BONUS: Flush de toda la base de datos (usar con cuidado)
  async flushDb(): Promise<void> {
    await this.client.flushDb();
  }
}