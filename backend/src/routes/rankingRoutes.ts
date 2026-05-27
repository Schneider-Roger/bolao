import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { getRanking, getMinhaposicao } from '../controllers/ranking/rankingController';

const router = Router();

router.get('/', authMiddleware, getRanking);           // Top 10 + últimos 4
router.get('/minha-posicao', authMiddleware, getMinhaposicao); // Posição do usuário logado

export default router;
