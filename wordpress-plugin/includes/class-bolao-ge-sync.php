<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Bolao_GE_Sync {
    
    /**
     * Normaliza a grafia das seleções para evitar conflitos (ex: Tchéquia vs República Tcheca)
     */
    private static function normalizarNomeSelecao($nome) {
        $n = strtolower(trim(strval($nome)));
        $mapa = array(
            'qatar' => 'catar',
            'tchéquia' => 'república tcheca',
            'bósnia & herzegovina' => 'bósnia e herzegovina',
            'curaçao' => 'curaçau',
            'congo' => 'rd do congo',
            'rd congo' => 'rd do congo',
            'república democrática do congo' => 'rd do congo'
        );
        return isset($mapa[$n]) ? $mapa[$n] : $n;
    }

    /**
     * Consome a API/feed do Globo Esporte de forma assíncrona
     */
    private static function fetchResultadosGE() {
        // Feed oficial do GE para a Copa do Mundo
        $url = 'https://api.globoesporte.globo.com/campeonato/copa-do-mundo/jogos';

        // Permitir filtro/mocking para fins de testes ou homologação
        $url_simulada = apply_filters('bolao_ge_api_url', '');
        if (!empty($url_simulada)) {
            $url = $url_simulada;
        }

        $response = wp_remote_get($url, array(
            'timeout' => 12,
            'sslverify' => false // Evita falhas de SSL em ambientes locais de desenvolvimento
        ));

        if (is_wp_error($response)) {
            return array();
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        // Se a API retornar um formato de objeto aninhado ou lista, filtramos aqui.
        // Esperamos um array de jogos contendo {time_a, time_b, placar_a, placar_b, encerrado}
        return is_array($data) ? $data : array();
    }

    /**
     * Método principal que realiza a sincronização automática e recalcula o ranking
     */
    public static function sincronizarPlacaresGE() {
        global $wpdb;
        $table_jogos = Bolao_DB::get_table_name('jogos');

        try {
            $geJogos = self::fetchResultadosGE();
            if (empty($geJogos)) {
                return array('success' => true, 'atualizados' => 0);
            }

            // Buscar jogos no banco que ainda não foram pontuados
            $jogosBanco = $wpdb->get_results("
                SELECT id, time_a, time_b, status 
                FROM $table_jogos 
                WHERE status IN ('aberto', 'fecha_em_breve', 'bloqueado')
            ");

            $totalAtualizados = 0;

            foreach ($jogosBanco as $jogoDb) {
                $correspondente = null;

                // Encontrar o jogo correspondente no feed do GE
                foreach ($geJogos as $gj) {
                    if (isset($gj['time_a']) && isset($gj['time_b'])) {
                        $nomeA_GE = self::normalizarNomeSelecao($gj['time_a']);
                        $nomeB_GE = self::normalizarNomeSelecao($gj['time_b']);
                        $nomeA_DB = self::normalizarNomeSelecao($jogoDb->time_a);
                        $nomeB_DB = self::normalizarNomeSelecao($jogoDb->time_b);

                        if ($nomeA_GE === $nomeA_DB && $nomeB_GE === $nomeB_DB) {
                            $correspondente = $gj;
                            break;
                        }
                    }
                }

                // Se o jogo encerrou no feed, atualiza no banco local e pontua os usuários
                if (!empty($correspondente) && !empty($correspondente['encerrado'])) {
                    $placar_a = intval($correspondente['placar_a']);
                    $placar_b = intval($correspondente['placar_b']);
                    $classificado = isset($correspondente['classificado']) ? sanitize_text_field($correspondente['classificado']) : null;

                    // 1. Atualizar placar real e encerrar jogo
                    $wpdb->update(
                        $table_jogos,
                        array(
                            'placar_a' => $placar_a,
                            'placar_b' => $placar_b,
                            'classificado' => $classificado,
                            'status' => 'encerrado'
                        ),
                        array('id' => $jogoDb->id)
                    );

                    // 2. Rodar motor de pontuação automática
                    Bolao_Pontuacao::pontuarJogo($jogoDb->id);
                    $totalAtualizados++;
                }
            }

            return array('success' => true, 'atualizados' => $totalAtualizados);
        } catch (Exception $e) {
            error_log('[GE Sincronizador] Erro grave: ' . $e->getMessage());
            return array('success' => false, 'atualizados' => 0);
        }
    }
}
