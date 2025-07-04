"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const envalid_1 = require("envalid");
exports.env = (0, envalid_1.cleanEnv)(process.env, {
    JWT_ISSUER: (0, envalid_1.str)({ default: 'my-app-api' }),
    JWT_AUDIENCE: (0, envalid_1.str)({ default: 'my-app-client' }),
    NODE_ENV: (0, envalid_1.str)({ choices: ['development', 'test', 'production'], default: 'development' }),
    JWT_SECRET: (0, envalid_1.str)({ default: 'SAD6468SD878.-07887878877878977UKjkfsjhÑÑksjfpñ' }),
    PORT: (0, envalid_1.str)({ default: '300' }),
    DATABASE_URL: (0, envalid_1.str)({ default: 'postgresql://postgres:1234@localhost:5432/Cosaif?schema=public' }),
});
