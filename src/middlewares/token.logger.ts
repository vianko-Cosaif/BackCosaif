// src/middlewares/token.logger.ts
import { logger } from '../utils/logger';
export const tokenLogger = logger.child({ scope: 'token' });
