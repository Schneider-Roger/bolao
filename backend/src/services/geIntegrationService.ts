import pool from '../config/db';
import { pontuarJogo } from './pontuacaoService';
import type { RowDataPacket } from 'mysql2';

// Interface do jogo no retorno da API do GE / Feed de resultados
interface GEJogo {
  time_a: string;
  time_b: string;
  placar_a: number;
  placar_b: number;
  encerrado: boolean;
  classificado?: string; // Para mata-mata
}

// Simulador de API em tempo real para testes / Homologação (Copa 2026)
// Retorna os placares reais da Copa do Mundo conforme eles forem acontecendo
async function fetchResultadosGE(): Promise<GEJogo[]> {
  try {
    // URL simulada de feed de placares atualizados em tempo real para desenvolvimento e homologação.
    // Em produção (Junho 2026), pode ser alterada para apontar para o feed JSON oficial do GE:
    // Ex: https://api.globoesporte.globo.com/campeonato/copa-do-mundo/jogos
    
    // MOCK REALISTA: Simula alguns jogos terminados para demonstrar a automação funcionando de forma mágica!
    // DESATIVADO para o lançamento: a copa ainda não começou
    return [];
  } catch (error) {
    console.error('Erro ao buscar placares da API do GE:', error);
    return [];
  }
}

function normalizarNomeSelecao(nome: string): string {
  const n = nome.toLowerCase().trim();
  const mapa: Record<string, string> = {
    'qatar': 'catar',
    'tchéquia': 'república tcheca',
    'bósnia & herzegovina': 'bósnia e herzegovina',
    'curaçao': 'curaçau',
    'congo': 'rd do congo',
    'rd congo': 'rd do congo',
    'república democrática do congo': 'rd do congo'
  };
  return mapa[n] || n;
}

/**
 * Executa a sincronização de placares e atualiza o ranking automaticamente.
 * Pode ser disparada via Cron Job ou manualmente no Painel Admin.
 */
export async function sincronizarPlacaresGE(): Promise<{ success: boolean; atualizados: number }> {
  try {
    console.log('[GE Sincronizador] Iniciando atualização automática de placares...');
    const geJogos = await fetchResultadosGE();
    
    if (geJogos.length === 0) {
      console.log('[GE Sincronizador] Nenhum placar retornado pela API.');
      return { success: true, atualizados: 0 };
    }

    // Busca todos os jogos no banco que ainda não foram pontuados
    const [jogosBanco] = await pool.query<RowDataPacket[]>(
      "SELECT id, time_a, time_b, status FROM jogos WHERE status IN ('aberto', 'fecha_em_breve', 'bloqueado')"
    );

    let totalAtualizados = 0;

    for (const jogoDb of jogosBanco) {
      // Procura se este jogo já terminou no feed do GE
      const correspondente = geJogos.find(
        (gj) =>
          normalizarNomeSelecao(gj.time_a) === normalizarNomeSelecao(jogoDb.time_a) &&
          normalizarNomeSelecao(gj.time_b) === normalizarNomeSelecao(jogoDb.time_b)
      );

      // Se encontrou o jogo encerrado na API, atualiza e pontua automaticamente!
      if (correspondente && correspondente.encerrado) {
        console.log(`[GE Sincronizador] Atualizando jogo: ${jogoDb.time_a} x ${jogoDb.time_b} -> Placar: ${correspondente.placar_a} x ${correspondente.placar_b}`);
        
        // 1. Atualiza placar real e classificado (se houver) no banco de dados
        await pool.query(`
          UPDATE jogos 
          SET placar_a = ?, placar_b = ?, classificado = ?, status = 'encerrado'
          WHERE id = ?
        `, [
          correspondente.placar_a, 
          correspondente.placar_b, 
          correspondente.classificado || null, 
          jogoDb.id
        ]);

        // 2. Roda o motor de pontuação automática para este jogo (recalculando pontos e ranking)
        await pontuarJogo(jogoDb.id);
        
        totalAtualizados++;
      }
    }

    console.log(`[GE Sincronizador] Sincronização concluída. ${totalAtualizados} jogos atualizados e pontuados.`);
    return { success: true, atualizados: totalAtualizados };
  } catch (error) {
    console.error('[GE Sincronizador] Erro grave durante a sincronização:', error);
    return { success: false, atualizados: 0 };
  }
}

/**
 * Inicializa o agendador automático em background (executa a cada 1 minuto)
 */
export function inicializarAgendadorGE() {
  // 1 minuto = 1 * 60 * 1000 ms
  const INTERVALO_MS = 1 * 60 * 1000;
  
  console.log('[GE Sincronizador] Agendador em background inicializado! Executando a cada 1 minuto.');
  
  setInterval(async () => {
    try {
      await sincronizarPlacaresGE();
    } catch (err) {
      console.error('[GE Sincronizador] Erro no agendamento periódico:', err);
    }
  }, INTERVALO_MS);
}
