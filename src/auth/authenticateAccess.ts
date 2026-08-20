import { Request, RequestHandler, Response } from 'express';
import passport from '../middlewares/passport';
import { getAccessTtlForRole, shouldSlideSessionByRole } from './sessionPolicy';
import { logger } from '../utils/logger';
import type { AuthenticatedUser } from '../types/auth';
import * as tokenService from '../middlewares/token.service';
import { buildAuthorizationProfile, type AuthorizationProfile } from './accessPolicy';

const addSessionHeaders = (res: Response, expiresAt: Date) => {
  res.setHeader('x-session-expires-at', expiresAt.toISOString());
};

const refreshSessionIfNeeded = async (req: Request, res: Response) => {
  const user = req.user as AuthenticatedUser | undefined;
  if (!user?.auth?.jti) return;
  if (!shouldSlideSessionByRole(user.rol)) return;

  const ttl = getAccessTtlForRole(user.rol);
  const expiresAt = await tokenService.extenderSesionPorJti(user.auth.jti, ttl, {
    reqId: (req.headers['x-req-id'] as string) || (req.headers['x-request-id'] as string) || null,
    usuarioId: user.id,
  });

  user.auth.expiresAt = expiresAt.toISOString();
  addSessionHeaders(res, expiresAt);
};

export const authenticateAccess: RequestHandler = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (error: unknown, user: Express.User | false, info?: { message?: string }) => {
    if (error) return next(error as Error);
    if (!user) return res.status(401).json({ error: info?.message ?? 'No autorizado' });

    req.user = user;
    (req as Request & { authorization?: AuthorizationProfile }).authorization =
      buildAuthorizationProfile(user as AuthenticatedUser);

    void (async () => {
      try {
        await refreshSessionIfNeeded(req, res);
      } catch (sessionError: any) {
        logger.warn('auth:session_refresh:error', {
          userId: (user as AuthenticatedUser).id,
          message: sessionError?.message ?? String(sessionError),
        });
      }

      next();
    })();
  })(req, res, next);
};
