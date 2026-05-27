<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Bolao_Pontuacao {
    
    /**
     * Determina o resultado (V = time_a vence, E = empate, D = time_a perde)
     */
    private static function getResultado($a, $b) {
        if ($a > $b) return 'V';
        if ($a === $b) return 'E';
        return 'D';
    }

    /**
     * Verifica se é fase de grupos ou 16avos de final
     */
    private static function isFaseGrupoOu16avos($fase) {
        $f = strtolower($fase);
        return strpos($f, 'grupo') !== false || strpos($f, '16') !== false || strpos($f, 'avos') !== false;
    }

    /**
     * Verifica se é fase eliminatória direta sem empate regulamentar (oitavas em diante)
     */
    private static function isMataMataSemEmpate($fase) {
        $f = strtolower($fase);
        return strpos($f, 'oitava') !== false || strpos($f, 'quarta') !== false || strpos($f, 'semi') !== false || strpos($f, 'final') !== false || strpos($f, 'terceiro') !== false;
    }

    /**
     * Calcula os pontos de um palpite específico em relação ao resultado real do jogo
     */
    public static function calcularPontosPalpite($jogo, $palpite) {
        $placar_a_real = intval($jogo->placar_a);
        $placar_b_real = intval($jogo->placar_b);
        $placar_a_palpite = intval($palpite->palpite_a);
        $placar_b_palpite = intval($palpite->palpite_b);

        $resultadoReal = self::getResultado($placar_a_real, $placar_b_real);
        $resultadoPalpite = self::getResultado($placar_a_palpite, $placar_b_palpite);

        $acertouResultado = $resultadoReal === $resultadoPalpite;
        $acertouPlacar = $placar_a_palpite === $placar_a_real && $placar_b_palpite === $placar_b_real;

        $eEmpateReal = $resultadoReal === 'E';

        // 1. Acerto de confronto (oitavas de final em diante)
        $acertouConfronto = false;
        if (!empty($palpite->confronto_time_a) && !empty($palpite->confronto_time_b) && !empty($jogo->time_a) && !empty($jogo->time_b)) {
            $confrontoReal = array(strtolower(trim($jogo->time_a)), strtolower(trim($jogo->time_b)));
            sort($confrontoReal);
            $confrontoPrev = array(strtolower(trim($palpite->confronto_time_a)), strtolower(trim($palpite->confronto_time_b)));
            sort($confrontoPrev);
            $acertouConfronto = ($confrontoReal[0] === $confrontoPrev[0]) && ($confrontoReal[1] === $confrontoPrev[1]);
        }

        // 2. Acerto de classificado (mata-mata com empate)
        $acertouClassificado = false;
        if (!empty($palpite->time_classificado_palpite) && !empty($jogo->classificado)) {
            $acertouClassificado = strtolower(trim($palpite->time_classificado_palpite)) === strtolower(trim($jogo->classificado));
        }

        $pontos = 0;

        if (self::isFaseGrupoOu16avos($jogo->fase)) {
            // Fase de grupos e 16avos: resultado + placar = 5 | apenas resultado = 2
            if ($acertouResultado) {
                $pontos = $acertouPlacar ? 5 : 2;
            }
        } elseif (self::isMataMataSemEmpate($jogo->fase)) {
            if ($eEmpateReal) {
                // Mata-mata terminando em empate regulamentar: valida classificado nos pênaltis
                if ($acertouClassificado) {
                    $pontos = $acertouPlacar ? 5 : 2;
                }
            } else {
                // Mata-mata terminando com vitória no tempo normal/prorrogação: valida confronto
                if ($acertouResultado) {
                    $pontos = ($acertouConfronto && $acertouPlacar) ? 5 : 2;
                }
            }
        }

        return array(
            'pontos' => $pontos,
            'acertou_resultado' => $acertouResultado ? 1 : 0,
            'acertou_placar' => $acertouPlacar ? 1 : 0,
            'acertou_confronto' => $acertouConfronto ? 1 : 0
        );
    }

    /**
     * Recalcula o ranking geral de classificação dos colaboradores
     */
    public static function recalcularRanking() {
        global $wpdb;
        $table_colaboradores = Bolao_DB::get_table_name('colaboradores');
        $table_palpites = Bolao_DB::get_table_name('palpites');
        $table_jogos = Bolao_DB::get_table_name('jogos');
        $table_especiais = Bolao_DB::get_table_name('palpites_especiais');
        $table_ranking = Bolao_DB::get_table_name('ranking');

        // Buscar dados consolidados de pontos
        $rows = $wpdb->get_results("
            SELECT 
              c.id AS colaborador_id,
              COALESCE(SUM(pj.pontos), 0) AS pontos_total,
              COALESCE(SUM(CASE WHEN pj.acertou_placar = 1 THEN 1 ELSE 0 END), 0) AS placares_exatos,
              COALESCE(SUM(CASE WHEN pj.acertou_resultado = 1 THEN 1 ELSE 0 END), 0) AS acertos_resultado,
              COALESCE(SUM(CASE WHEN pj.acertou_resultado = 0 AND pj.id IS NOT NULL THEN 1 ELSE 0 END), 0) AS erros,
              COUNT(pj.id) AS palpites_feitos
            FROM $table_colaboradores c
            LEFT JOIN (
              SELECT p.* 
              FROM $table_palpites p
              INNER JOIN $table_jogos j ON j.id = p.jogo_id AND j.status = 'pontuado'
            ) pj ON pj.colaborador_id = c.id
            WHERE c.ativo = 1 AND c.apelido IS NOT NULL AND c.selecao_favorita IS NOT NULL
            GROUP BY c.id
        ");

        // Buscar acertos dos palpites especiais (se a tabela existir)
        $especiais = array();
        $tabela_especiais_existe = $wpdb->get_var("SHOW TABLES LIKE '$table_especiais'") === $table_especiais;
        if ($tabela_especiais_existe) {
            $especiais_rows = $wpdb->get_results("
                SELECT 
                  colaborador_id,
                  acertou_campeao,
                  acertou_vice,
                  acertou_terceiro,
                  acertou_quarto
                FROM $table_especiais
            ");
            foreach ($especiais_rows as $e) {
                $especiais[$e->colaborador_id] = $e;
            }
        }

        // Estruturar dados do ranking
        $rankingData = array();
        foreach ($rows as $r) {
            $e = isset($especiais[$r->colaborador_id]) ? $especiais[$r->colaborador_id] : null;
            $rankingData[] = array(
                'colaborador_id' => intval($r->colaborador_id),
                'pontos_total' => intval($r->pontos_total),
                'placares_exatos' => intval($r->placares_exatos),
                'acertos_resultado' => intval($r->acertos_resultado),
                'erros' => intval($r->erros),
                'palpites_feitos' => intval($r->palpites_feitos),
                'desempate_campeao' => (!empty($e) && $e->acertou_campeao) ? 1 : 0,
                'desempate_vice' => (!empty($e) && $e->acertou_vice) ? 1 : 0,
                'desempate_terceiro' => (!empty($e) && $e->acertou_terceiro) ? 1 : 0,
                'desempate_quarto' => (!empty($e) && $e->acertou_quarto) ? 1 : 0
            );
        }

        // Ordenação rigorosa por regras oficiais de desempate
        usort($rankingData, function($a, $b) {
            if ($b['pontos_total'] !== $a['pontos_total']) return $b['pontos_total'] - $a['pontos_total'];
            if ($b['desempate_campeao'] !== $a['desempate_campeao']) return $b['desempate_campeao'] - $a['desempate_campeao'];
            if ($b['desempate_vice'] !== $a['desempate_vice']) return $b['desempate_vice'] - $a['desempate_vice'];
            if ($b['desempate_terceiro'] !== $a['desempate_terceiro']) return $b['desempate_terceiro'] - $a['desempate_terceiro'];
            if ($b['desempate_quarto'] !== $a['desempate_quarto']) return $b['desempate_quarto'] - $a['desempate_quarto'];
            if ($b['placares_exatos'] !== $a['placares_exatos']) return $b['placares_exatos'] - $a['placares_exatos'];
            return 0;
        });

        // Limpar e reconstruir posições
        $wpdb->query("DELETE FROM $table_ranking");

        $currentPosition = 1;
        for ($i = 0; $i < count($rankingData); $i++) {
            $r = $rankingData[$i];
            if ($i > 0) {
                $prev = $rankingData[$i - 1];
                $isTied =
                  $r['pontos_total'] === $prev['pontos_total'] &&
                  $r['desempate_campeao'] === $prev['desempate_campeao'] &&
                  $r['desempate_vice'] === $prev['desempate_vice'] &&
                  $r['desempate_terceiro'] === $prev['desempate_terceiro'] &&
                  $r['desempate_quarto'] === $prev['desempate_quarto'] &&
                  $r['placares_exatos'] === $prev['placares_exatos'];

                if (!$isTied) {
                    $currentPosition = $i + 1;
                }
            }

            $wpdb->insert($table_ranking, array(
                'colaborador_id' => $r['colaborador_id'],
                'posicao' => $currentPosition,
                'pontos_total' => $r['pontos_total'],
                'placares_exatos' => $r['placares_exatos'],
                'acertos_resultado' => $r['acertos_resultado'],
                'erros' => $r['erros'],
                'palpites_feitos' => $r['palpites_feitos'],
                'desempate_campeao' => $r['desempate_campeao'],
                'desempate_vice' => $r['desempate_vice'],
                'desempate_terceiro' => $r['desempate_terceiro'],
                'desempate_quarto' => $r['desempate_quarto']
            ));
        }
    }

    /**
     * Processa a pontuação de todos os palpites após a conclusão real de um jogo
     */
    public static function pontuarJogo($jogoId) {
        global $wpdb;
        $table_jogos = Bolao_DB::get_table_name('jogos');
        $table_palpites = Bolao_DB::get_table_name('palpites');

        $jogo = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_jogos WHERE id = %d", $jogoId));
        if (empty($jogo)) {
            throw new Exception('Jogo não encontrado');
        }

        $palpites = $wpdb->get_results($wpdb->prepare("SELECT * FROM $table_palpites WHERE jogo_id = %d", $jogoId));

        foreach ($palpites as $palpite) {
            $pontosData = self::calcularPontosPalpite($jogo, $palpite);
            $wpdb->update(
                $table_palpites,
                array(
                    'pontos' => $pontosData['pontos'],
                    'acertou_resultado' => $pontosData['acertou_resultado'],
                    'acertou_placar' => $pontosData['acertou_placar'],
                    'acertou_confronto' => $pontosData['acertou_confronto']
                ),
                array('id' => $palpite->id)
            );
        }

        // Marcar jogo como pontuado
        $wpdb->update($table_jogos, array('status' => 'pontuado'), array('id' => $jogoId));

        // Recalcular classificação do ranking global
        self::recalcularRanking();
    }
}
