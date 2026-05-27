import { Router } from 'express';
import { getJogos, getJogoById, salvarPalpite, getMeusResultados, getBracket, salvarBracket, getPalpitesEspeciais, salvarPalpitesEspeciais } from '../controllers/jogos/jogosController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authMiddleware, getJogos);
router.get('/meus-resultados', authMiddleware, getMeusResultados);
router.get('/bracket', authMiddleware, getBracket);
router.post('/bracket/salvar', authMiddleware, salvarBracket);
router.get('/especiais', authMiddleware, getPalpitesEspeciais);
router.post('/especiais', authMiddleware, salvarPalpitesEspeciais);
router.get('/:id', authMiddleware, getJogoById);
router.post('/:id/palpite', authMiddleware, salvarPalpite);

export default router;
