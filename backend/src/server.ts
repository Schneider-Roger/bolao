import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import pool from './config/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Necessário para o Express confiar no header X-Forwarded-For enviado pelo Nginx (proxy reverso)
// Sem isso, express-rate-limit lança ValidationError e bloqueia requisições de login
app.set('trust proxy', 1);

// Segurança
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // Permite carregar imagens de outros domínios se necessário

// Middlewares
// Em produção, o Nginx envia origin http://18.191.241.16 (IP do servidor)
// CORS_ORIGIN pode ser definido no .env para permitir o IP/domínio de produção
const extraOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  ...extraOrigins,
];
app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (ex: curl, mobile apps, Nginx interno)
    // e qualquer origin na lista de permitidas (localhost + CORS_ORIGIN)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Em produção, logar a origin bloqueada para debug
      console.warn(`CORS bloqueado para origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

import authRoutes from './routes/authRoutes';
import jogosRoutes from './routes/jogosRoutes';
import adminRoutes from './routes/adminRoutes';
import rankingRoutes from './routes/rankingRoutes';
import { inicializarAgendadorGE } from './services/geIntegrationService';

// Basic route
app.get('/', (req, res) => {
  res.send('API Bolão Copa 2026 está rodando!');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jogos', jogosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ranking', rankingRoutes);

// Start server
const startServer = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Conectado ao banco de dados MySQL com sucesso!');
    connection.release();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      // Inicializa o sincronizador automático de placares do Globo Esporte / GE
      inicializarAgendadorGE();
    });
  } catch (error) {
    console.error('Erro ao conectar no banco de dados:', error);
  }
};

startServer();
