<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Bolao_Cron {
    
    /**
     * Adiciona o intervalo customizado de 1 minuto aos agendamentos do WP-Cron
     */
    public static function add_one_minute_interval($schedules) {
        $schedules['bolao_one_minute'] = array(
            'interval' => 60, // 60 segundos
            'display'  => __('A cada 1 minuto', 'bolao-copa-2026')
        );
        return $schedules;
    }

    /**
     * Agenda o evento recorrente na ativação do plugin
     */
    public static function register_events() {
        if (!wp_next_scheduled('bolao_cron_sync_event')) {
            // Agenda para começar imediatamente rodando no intervalo de 1 minuto
            wp_schedule_event(time(), 'bolao_one_minute', 'bolao_cron_sync_event');
        }
    }

    /**
     * Limpa o agendamento na desativação do plugin para evitar processos órfãos
     */
    public static function clear_events() {
        wp_clear_scheduled_hook('bolao_cron_sync_event');
    }

    /**
     * Inicializa os ganchos do Cron no WordPress
     */
    public static function init() {
        // Registrar o filtro para adicionar o intervalo
        add_filter('cron_schedules', array('Bolao_Cron', 'add_one_minute_interval'));
        
        // Associar o evento agendado ao sincronizador de placares do Globo Esporte
        add_action('bolao_cron_sync_event', array('Bolao_GE_Sync', 'sincronizarPlacaresGE'));
    }
}

// Inicializar os hooks do Cron
Bolao_Cron::init();
