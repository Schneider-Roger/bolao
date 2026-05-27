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

// Segurança
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // Permite carregar imagens de outros domínios se necessário

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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
