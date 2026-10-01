import path from 'path';
import dotenv from 'dotenv';
import { instrumentPrisma } from '../performance/metrics';

dotenv.config({ path: path.resolve(process.cwd(), 'msTorno', '.env'), override: false });
dotenv.config({ path: path.resolve(process.cwd(), 'msTorno', '.env.torno'), override: false });
dotenv.config({ path: path.resolve(process.cwd(), 'ms_torreon', '.env.torreon'), override: false });

// Reuse generated clients; each points to its own service database.
const { PrismaClient: TorreonClient } = require('../../ms_torreon/generated');
const { PrismaClient: TornoClient } = require('../../msTorno/generated');
export const prismaTorreon = instrumentPrisma(new TorreonClient(), 'torreon');
export const prismaTorno = instrumentPrisma(new TornoClient(), 'torno');
