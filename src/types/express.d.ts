import type { AuthenticatedUser } from './auth';

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
  }
}

export {};
