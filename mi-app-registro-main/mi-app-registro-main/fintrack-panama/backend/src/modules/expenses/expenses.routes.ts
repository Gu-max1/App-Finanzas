import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import { create, list, getOne, update, remove, summary } from './expenses.controller';

const router = Router();
router.use(authenticate);

router.get('/summary', summary);
router.post('/', create);
router.get('/', list);
router.get('/:id', getOne);
router.patch('/:id', update);
router.delete('/:id', remove);

export default router;
