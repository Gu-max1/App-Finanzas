import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import { create, list, getOne, update, patchBalance, remove, suggestedBanks } from './bankAccounts.controller';

const router = Router();
router.use(authenticate);

router.get('/banks', suggestedBanks);
router.post('/', create);
router.get('/', list);
router.get('/:id', getOne);
router.patch('/:id', update);
router.patch('/:id/balance', patchBalance);
router.delete('/:id', remove);

export default router;
