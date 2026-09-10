import { instrumentPrisma } from '../performance/metrics';
// Reuse generated clients; each points to its own service database.
const { PrismaClient: TorreonClient } = require('../../ms_torreon/generated');
const { PrismaClient: TornoClient } = require('../../msTorno/generated');
export const prismaTorreon = instrumentPrisma(new TorreonClient(), 'torreon');
export const prismaTorno = instrumentPrisma(new TornoClient(), 'torno');
