import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import {
  create, list, getOne, update, remove,
  addPayment, amortization, simulateExtra,
  creditCardAnalysis, strategies, debtFreeProjection,
} from './bankDebts.controller';

const router = Router();
router.use(authenticate);

router.get('/strategies', strategies);
router.get('/projection', debtFreeProjection);
router.post('/', create);
router.get('/', list);
router.get('/:id', getOne);
router.patch('/:id', update);
router.delete('/:id', remove);
router.post('/:id/payments', addPayment);
router.get('/:id/amortization', amortization);
router.post('/:id/simulate-extra', simulateExtra);
router.get('/:id/credit-card-analysis', creditCardAnalysis);

export default router;
