import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://loguser:logpassword@localhost:5432/loganalyzer',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  uploadsDir: process.env.UPLOADS_DIR || './uploads',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),
  claudeModel: 'claude-sonnet-4-6',
};
