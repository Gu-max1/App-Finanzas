import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import { create, list, getOne, update, remove, addPayment, amortization, strategies } from './debts.controller';

const router = Router();
router.use(authenticate);

router.get('/strategies', strategies);
router.post('/', create);
router.get('/', list);
router.get('/:id', getOne);
router.patch('/:id', update);
router.delete('/:id', remove);
router.post('/:id/payments', addPayment);
router.get('/:id/amortization', amortization);

export default router;
