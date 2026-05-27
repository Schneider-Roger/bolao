<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Bolao_DB {
    
    /**
     * Retorna o nome da tabela com o prefixo do WordPress
     */
    public static function get_table_name($table) {
        global $wpdb;
        return $wpdb->prefix . $table;
    }

    /**
     * Cria as tabelas do Bolão de forma nativa e incremental no banco de dados do WordPress
     */
    public static function create_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        // 1. Tabela Colaboradores (Substituindo os hashes individuais pelo credencial_hash composto)
        $table_colaboradores = self::get_table_name('colaboradores');
        $sql_colaboradores = "CREATE TABLE $table_colaboradores (
            id int(11) NOT NULL AUTO_INCREMENT,
            codigo_funcionario text NOT NULL,
            nome text NOT NULL,
            data_nascimento text NOT NULL,
            credencial_hash varchar(64) NOT NULL,
            setor text NULL,
            unidade text NULL,
            foto_perfil varchar(255) NULL,
            apelido text NULL,
            selecao_favorita varchar(50) NULL,
            ativo tinyint(1) DEFAULT 1,
            bracket_mata_mata_salvo tinyint(1) DEFAULT 0,
            email_corporativo text NULL,
            role varchar(20) DEFAULT 'USER',
            PRIMARY KEY  (id),
            UNIQUE KEY credencial_hash (credencial_hash)
        ) $charset_collate;";
        dbDelta($sql_colaboradores);

        // 2. Tabela Jogos
        $table_jogos = self::get_table_name('jogos');
        $sql_jogos = "CREATE TABLE $table_jogos (
            id int(11) NOT NULL AUTO_INCREMENT,
            fase varchar(50) NOT NULL,
            rodada int(11) NULL,
            time_a varchar(50) NOT NULL,
            time_b varchar(50) NOT NULL,
            data_hora datetime NOT NULL,
            status varchar(20) DEFAULT 'aberto',
            placar_a int(11) NULL,
            placar_b int(11) NULL,
            classificado varchar(50) NULL,
            encerramento_palpite datetime NOT NULL,
            PRIMARY KEY  (id)
        ) $charset_collate;";
        dbDelta($sql_jogos);

        // 3. Tabela Palpites
        $table_palpites = self::get_table_name('palpites');
        $sql_palpites = "CREATE TABLE $table_palpites (
            id int(11) NOT NULL AUTO_INCREMENT,
            colaborador_id int(11) NOT NULL,
            jogo_id int(11) NOT NULL,
            palpite_a int(11) NULL,
            palpite_b int(11) NULL,
            time_classificado_palpite varchar(50) NULL,
            confronto_time_a varchar(50) NULL,
            confronto_time_b varchar(50) NULL,
            acertou_resultado tinyint(1) DEFAULT 0,
            acertou_placar tinyint(1) DEFAULT 0,
            acertou_confronto tinyint(1) DEFAULT 0,
            pontos int(11) DEFAULT 0,
            PRIMARY KEY  (id),
            UNIQUE KEY unique_palpite (colaborador_id, jogo_id)
        ) $charset_collate;";
        dbDelta($sql_palpites);

        // 4. Tabela Ranking
        $table_ranking = self::get_table_name('ranking');
        $sql_ranking = "CREATE TABLE $table_ranking (
            colaborador_id int(11) NOT NULL,
            posicao int(11) NULL,
            pontos_total int(11) DEFAULT 0,
            placares_exatos int(11) DEFAULT 0,
            acertos_resultado int(11) DEFAULT 0,
            erros int(11) DEFAULT 0,
            palpites_feitos int(11) DEFAULT 0,
            desempate_campeao tinyint(1) DEFAULT 0,
            desempate_vice tinyint(1) DEFAULT 0,
            desempate_terceiro tinyint(1) DEFAULT 0,
            desempate_quarto tinyint(1) DEFAULT 0,
            PRIMARY KEY  (colaborador_id)
        ) $charset_collate;";
        dbDelta($sql_ranking);
    }
}
