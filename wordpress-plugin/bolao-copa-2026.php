<?php
/*
Plugin Name: Bolão Copa 2026
Description: Backend do Bolão Copa 2026 integrado de forma nativa e segura ao WordPress com APIs criptografadas.
Version: 1.0.0
Author: Antigravity pair Schneider-Roger
License: GPL2
*/

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// Definir diretório base do plugin
define( 'BOLAO_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );

// Requerer componentes principais
require_once BOLAO_PLUGIN_DIR . 'includes/class-bolao-db.php';
require_once BOLAO_PLUGIN_DIR . 'includes/class-bolao-crypto.php';
require_once BOLAO_PLUGIN_DIR . 'includes/class-bolao-pontuacao.php';
require_once BOLAO_PLUGIN_DIR . 'includes/class-bolao-ge-sync.php';
require_once BOLAO_PLUGIN_DIR . 'includes/class-bolao-cron.php';
require_once BOLAO_PLUGIN_DIR . 'includes/class-bolao-rest-api.php';

// Ganchos de ativação e desativação
register_activation_hook( __FILE__, array( 'Bolao_DB', 'create_tables' ) );
register_activation_hook( __FILE__, array( 'Bolao_Cron', 'register_events' ) );
register_deactivation_hook( __FILE__, array( 'Bolao_Cron', 'clear_events' ) );

// Inicializar o plugin
add_action( 'plugins_loaded', 'bolao_init_plugin' );
function bolao_init_plugin() {
    Bolao_REST_API::init();
}
