import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SOROBAN_RPC_URL: z.string().url().default('https://soroban-testnet.stellar.org'),
  PAYMENTS_CONTRACT_ID: z
    .string()
    .min(10)
    .default('CDC6KVX7QT7CD3GOVGX44NQUNS7FMSZKIAXTV3TDGSXQKJRQMDZRSRCN'),
  POLICY_CONTRACT_ID: z
    .string()
    .min(10)
    .default('CCXFDOLLLFZKAG7X6AKN2YLKET5F5X565IHZXPOAGCM7W6MJG5WKANLN'),
});

export type ServerConfig = z.infer<typeof envSchema>;

export function loadConfig(env = process.env): ServerConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    console.error('Invalid server configuration:', result.error.format());
    throw new Error('Failed to load server configuration due to invalid environment variables');
  }
  return result.data;
}

export const serverConfig = loadConfig();
