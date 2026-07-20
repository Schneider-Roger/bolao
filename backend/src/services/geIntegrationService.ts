import pool from '../config/db';
import { pontuarJogo } from './pontuacaoService';
import type { RowDataPacket } from 'mysql2';
import https from 'https';

// Interface do jogo no retorno da API do GE / Feed de resultados
interface GEJogo {
  time_a: string;
  time_b: string;
  placar_a: number;
  placar_b: number;
  encerrado: boolean;
  classificado?: string; // Para mata-mata
}

const GE_CHAMPIONSHIP_UUID = 'b5ff9c28-476e-4816-a699-7645acc94cd0';

function obterMapeamentoGE(faseDb: string, rodadaDb: number | null): { phaseSlug: string; rodada: number } {
  const faseNorm = faseDb.trim();
  if (faseNorm.startsWith('Grupo')) {
    return {
      phaseSlug: 'fase-de-grupos-copa-do-mundo-2026',
      rodada: rodadaDb || 1
    };
  }
  
  const mapaKnockout: Record<string, string> = {
    '16avos de Final': 'segunda-fase-copa-do-mundo-2026',
    'Oitavas de Final': 'oitavas-copa-do-mundo-2026',
    'Quartas de Final': 'quartas-copa-do-mundo-2026',
    'Semifinal': 'semifinal-copa-do-mundo-2026',
    'Disputa 3º Lugar': 'terceiro-copa-do-mundo-2026',
    'Final': 'final-copa-do-mundo-2026'
  };

  const slug = mapaKnockout[faseNorm];
  if (slug) {
    return {
      phaseSlug: slug,
      rodada: 1
    };
  }

  return {
    phaseSlug: 'fase-de-grupos-copa-do-mundo-2026',
    rodada: 1
  };
}

function fetchGEHtml(url: string): Promise<string> {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      console.error(`[GE API] Erro de rede ao acessar HTML de ${url}:`, err);
      resolve('');
    });
  });
}

async function fetchResultadosGE(): Promise<GEJogo[]> {
  try {
    console.log('[GE Sincronizador] Buscando dados raspando a página HTML do GE...');
    const html = await fetchGEHtml('https://ge.globo.com/futebol/copa-do-mundo/');
    if (!html) {
      console.log('[GE Sincronizador] Não foi possível carregar o HTML do Globo Esporte.');
      return [];
    }

    const searchStr = 'const classificacao = ';
    const startIndex = html.indexOf(searchStr);
    if (startIndex === -1) {
      console.log('[GE Sincronizador] Bloco de dados "classificacao" não encontrado no HTML.');
      return [];
    }

    const valueStart = startIndex + searchStr.length;
    let braceCount = 0;
    let jsonStr = '';
    for (let i = valueStart; i < html.length; i++) {
      const char = html[i];
      jsonStr += char;
      if (char === '{') braceCount++;
      else if (char === '}') {
        braceCount--;
        if (braceCount === 0) break;
      }
    }

    const parsed = JSON.parse(jsonStr);
    const resultados: GEJogo[] = [];

    if (parsed && Array.isArray(parsed.secao)) {
      for (const sec of parsed.secao) {
        if (sec.chave && Array.isArray(sec.chave)) {
          for (const ch of sec.chave) {
            if (ch.jogos && Array.isArray(ch.jogos)) {
              for (const j of ch.jogos) {
                if (j.equipes?.mandante?.nome_popular && j.equipes?.visitante?.nome_popular && j.placar_oficial_mandante !== null && j.placar_oficial_visitante !== null) {
                  const placar_a = j.placar_oficial_mandante !== null ? j.placar_oficial_mandante : 0;
                  const placar_b = j.placar_oficial_visitante !== null ? j.placar_oficial_visitante : 0;
                  
                  const dataJogo = j.data_realizacao ? new Date(j.data_realizacao) : new Date();
                  const agora = new Date();
                  const diffMinutos = Math.floor((agora.getTime() - dataJogo.getTime()) / 60000);

                  const isMataMata = true; 
                  const tempoLimite = 165;
                  const encerrado = j.transmissao?.broadcast?.id === 'ENCERRADA' || diffMinutos >= tempoLimite;

                  let classificado: string | undefined = undefined;
                  let encerradoVal = encerrado;

                  if (encerradoVal && placar_a === placar_b) {
                    const pen_a = j.placar_penaltis_mandante;
                    const pen_b = j.placar_penaltis_visitante;
                    if (pen_a !== null && pen_b !== null) {
                      if (pen_a > pen_b) {
                        classificado = j.equipes.mandante.nome_popular;
                      } else if (pen_b > pen_a) {
                        classificado = j.equipes.visitante.nome_popular;
                      }
                    }
                    if (!classificado) {
                      encerradoVal = false;
                      console.log(`[GE Sincronizador] Jogo ${j.equipes.mandante.nome_popular} x ${j.equipes.visitante.nome_popular} empatou no mata-mata, esperando definição dos pênaltis.`);
                    }
                  }

                  // Se houve vencedor no tempo normal, o classificado é o time que fez mais gols
                  if (encerradoVal && placar_a !== placar_b) {
                    classificado = placar_a > placar_b ? j.equipes.mandante.nome_popular : j.equipes.visitante.nome_popular;
                  }

                  resultados.push({
                    time_a: j.equipes.mandante.nome_popular,
                    time_b: j.equipes.visitante.nome_popular,
                    placar_a,
                    placar_b,
                    encerrado: encerradoVal,
                    classificado
                  });
                }
              }
            }
          }
        }
      }
    }

    return resultados;
  } catch (error) {
    console.error('[GE API] Erro ao sincronizar placares a partir do HTML do GE:', error);
    return [];
  }
}

function normalizarNomeSelecao(nome: string): string {
  const n = nome.toLowerCase().trim();
  const mapa: Record<string, string> = {
    'qatar': 'catar',
    'tchéquia': 'república tcheca',
    'bósnia & herzegovina': 'bósnia e herzegovina',
    'bósnia': 'bósnia e herzegovina',
    'rd congo': 'congo',
    'rd do congo': 'congo',
    'república democrática do congo': 'congo',
    'congo': 'congo'
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

      if (correspondente) {
        if (correspondente.encerrado) {
          console.log(`[GE Sincronizador] Finalizando jogo: ${jogoDb.time_a} x ${jogoDb.time_b} -> Placar: ${correspondente.placar_a} x ${correspondente.placar_b}`);
          
          // 1. Atualiza placar real e classificado (se houver) no banco de dados e marca status como encerrado
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
        } else {
          // Jogo em andamento: atualiza placar ao vivo (parcial) sem pontuar ou mudar status
          console.log(`[GE Sincronizador] Atualizando placar ao vivo: ${jogoDb.time_a} x ${jogoDb.time_b} -> Placar: ${correspondente.placar_a} x ${correspondente.placar_b}`);
          await pool.query(`
            UPDATE jogos 
            SET placar_a = ?, placar_b = ?
            WHERE id = ?
          `, [
            correspondente.placar_a, 
            correspondente.placar_b, 
            jogoDb.id
          ]);
          
          totalAtualizados++;
        }
      }
    }

    console.log(`[GE Sincronizador] Sincronização concluída. ${totalAtualizados} jogos atualizados.`);
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
