import { cleanEnv, str } from 'envalid';

export const env = cleanEnv(process.env, {
  JWT_ISSUER: str({ default: 'my-app-api' }),
  JWT_AUDIENCE: str({ default: 'my-app-client' }),
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  JWT_SECRET: str({ default: 'SAD6468SD878.-07887878877878977UKjkfsjhÑÑksjfpñ' }),
  PORT: str({ default: '300' }),
  DATABASE_URL: str({ default: 'postgresql://postgres:1234@localhost:5432/Cosaif?schema=public' }),
});
