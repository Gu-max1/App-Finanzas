import { Router } from 'express';
import { register, login, refresh, logout, me } from './auth.controller';
import { authenticate } from '@middleware/authenticate';
import { authRateLimiter } from '@middleware/rateLimiter';

const router = Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);

export default router;
