import type { AuthenticatedUser } from './auth';
import type { AuthorizationProfile } from '../auth/accessPolicy';

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
    interface Request {
      authorization?: AuthorizationProfile;
    }
  }
}

export {};
