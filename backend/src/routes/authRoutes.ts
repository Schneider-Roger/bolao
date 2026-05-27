import { Router } from 'express';
import { login, me } from '../controllers/auth/loginController';
import { primeiroAcesso } from '../controllers/auth/primeiroAcessoController';
import { editarPerfil } from '../controllers/auth/editarPerfilController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { uploadPerfil } from '../middlewares/uploadMiddleware';
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 tentativas por IP
  message: { success: false, error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

const router = Router();

router.post('/login', loginLimiter, login);
router.get('/me', authMiddleware, me);

// Primeiro acesso requires the user to be logged in (have a valid token),
// and uses multer to process the 'foto' field in the form-data.
router.post(
  '/primeiro-acesso',
  authMiddleware,
  uploadPerfil.single('foto'),
  primeiroAcesso
);

router.put(
  '/editar-perfil',
  authMiddleware,
  uploadPerfil.single('foto'),
  editarPerfil
);

export default router;
