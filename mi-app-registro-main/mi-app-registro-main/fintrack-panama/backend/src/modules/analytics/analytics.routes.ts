import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import { dashboard } from './analytics.controller';

const router = Router();
router.use(authenticate);

router.get('/dashboard', dashboard);

export default router;
