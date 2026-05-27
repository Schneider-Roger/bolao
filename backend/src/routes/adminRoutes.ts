import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  updateResultadoJogo,
  recalcularRankingManual,
  getColaboradores,
  toggleColaboradorAtivo,
  editarColaborador,
  criarColaborador,
  excluirColaborador,
  upsertJogo,
  exportarRanking,
  sincronizarGEManual,
  importarColaboradoresExcel,
} from '../controllers/admin/adminController';
import multer from 'multer';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo inválido. Apenas Excel é permitido.'));
    }
  }
});
const router = Router();

// Middleware de Admin: Verifica role ADMIN
const adminMiddleware = (req: Request, res: Response, next: NextFunction): any => {
  // @ts-ignore
  const user = req.user;
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

router.use(authMiddleware);
router.use(adminMiddleware);

// ── Jogos ──
router.post('/jogos', upsertJogo);                           // Cadastrar jogo
router.put('/jogos/:id', upsertJogo);                        // Editar jogo
router.put('/jogos/:id/resultado', updateResultadoJogo);     // Salvar resultado + pontuar
router.post('/sincronizar-ge', sincronizarGEManual);          // Sincronizar placares da API do GE

// ── Ranking ──
router.post('/ranking/recalcular', recalcularRankingManual); // Recalcular manualmente
router.get('/ranking/exportar', exportarRanking);            // Exportar CSV

// ── Colaboradores ──
router.get('/colaboradores', getColaboradores);
router.post('/colaboradores', criarColaborador);
router.put('/colaboradores/:id', editarColaborador);
router.patch('/colaboradores/:id/ativo', toggleColaboradorAtivo);
router.delete('/colaboradores/:id', excluirColaborador);
router.post('/colaboradores/importar', upload.single('planilha'), importarColaboradoresExcel);

export default router;
