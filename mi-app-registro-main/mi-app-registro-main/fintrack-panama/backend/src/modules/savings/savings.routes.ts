import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import { create, list, getOne, update, remove, addContribution } from './savings.controller';

const router = Router();
router.use(authenticate);

router.post('/', create);
router.get('/', list);
router.get('/:id', getOne);
router.patch('/:id', update);
router.delete('/:id', remove);
router.post('/:id/contributions', addContribution);

export default router;
