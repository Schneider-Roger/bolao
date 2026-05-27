<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// ============================================================
// HELPER COMPACTO E SEGURO DE JWT PARA PHP
// ============================================================
class Bolao_JWT {
    private static function base64UrlEncode($data) {
        return str_replace('=', '', strtr(base64_encode($data), '+/', '-_'));
    }

    private static function base64UrlDecode($data) {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $padlen = 4 - $remainder;
            $data .= str_repeat('=', $padlen);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }

    public static function sign($payload, $secret, $exp = 604800) {
        $header = json_encode(array('typ' => 'JWT', 'alg' => 'HS256'));
        $payload['exp'] = time() + $exp;
        
        $base64UrlHeader = self::base64UrlEncode($header);
        $base64UrlPayload = self::base64UrlEncode(json_encode($payload));
        
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
        $base64UrlSignature = self::base64UrlEncode($signature);
        
        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public static function verify($token, $secret) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return false;
        
        $base64UrlHeader = $parts[0];
        $base64UrlPayload = $parts[1];
        $base64UrlSignature = $parts[2];
        
        $signature = self::base64UrlDecode($base64UrlSignature);
        $expectedSignature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
        
        if (!hash_equals($signature, $expectedSignature)) {
            return false;
        }
        
        $payload = json_decode(self::base64UrlDecode($base64UrlPayload), true);
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false; // Token expirado
        }
        
        return $payload;
    }
}

// ============================================================
// CONTROLADOR REST API PRINCIPAL DO BOLÃO
// ============================================================
class Bolao_REST_API {

    private static function get_jwt_secret() {
        return defined('BOLAO_JWT_SECRET') ? BOLAO_JWT_SECRET : (defined('AUTH_KEY') ? AUTH_KEY : 'default_secure_bolao_secret');
    }

    /**
     * Registra os ganchos da REST API no WordPress
     */
    public static function init() {
        add_action('rest_api_init', array('Bolao_REST_API', 'register_routes'));
        // Permitir CORS headers para desenvolvimento local facilitado
        add_filter('rest_pre_serve_request', array('Bolao_REST_API', 'handle_cors'), 10, 4);
    }

    public static function handle_cors($value, $result, $request, $server) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
        return $value;
    }

    /**
     * Autentica e extrai o colaborador ativo a partir do token JWT
     */
    private static function get_authenticated_user($request) {
        global $wpdb;
        $table_colaboradores = Bolao_DB::get_table_name('colaboradores');

        $token = '';
        // 1. Tentar ler do cabeçalho Authorization
        $auth_header = $request->get_header('Authorization');
        if (!empty($auth_header) && preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
            $token = $matches[1];
        }
        
        // 2. Tentar ler do cookie se não enviado por cabeçalho
        if (empty($token) && isset($_COOKIE['token'])) {
            $token = $_COOKIE['token'];
        }

        if (empty($token)) return null;

        $secret = self::get_jwt_secret();
        $payload = Bolao_JWT::verify($token, $secret);

        if (!$payload || empty($payload['id'])) return null;

        $colaborador = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_colaboradores WHERE id = %d AND ativo = 1 LIMIT 1", $payload['id']));
        return $colaborador;
    }

    /**
     * Verifica se o colaborador autenticado é ADMIN
     */
    private static function is_admin_user($colaborador) {
        return !empty($colaborador) && $colaborador->role === 'ADMIN';
    }

    /**
     * Registro das rotas da API REST do Bolão
     */
    public static function register_routes() {
        $namespace = 'bolao/v1';

        // ── AUTENTICAÇÃO ──
        register_rest_route($namespace, '/login', array(
            'methods' => 'POST',
            'callback' => array('Bolao_REST_API', 'handle_login'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/me', array(
            'methods' => 'GET',
            'callback' => array('Bolao_REST_API', 'handle_me'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/primeiro-acesso', array(
            'methods' => 'POST',
            'callback' => array('Bolao_REST_API', 'handle_primeiro_acesso'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/editar-perfil', array(
            'methods' => 'POST', // Usamos POST para suportar upload de arquivos facilmente no PHP
            'callback' => array('Bolao_REST_API', 'handle_editar_perfil'),
            'permission_callback' => '__return_true'
        ));

        // ── JOGOS E PALPITES ──
        register_rest_route($namespace, '/jogos', array(
            'methods' => 'GET',
            'callback' => array('Bolao_REST_API', 'handle_get_jogos'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/jogos/meus-resultados', array(
            'methods' => 'GET',
            'callback' => array('Bolao_REST_API', 'handle_get_meus_resultados'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/jogos/bracket', array(
            'methods' => 'GET',
            'callback' => array('Bolao_REST_API', 'handle_get_bracket'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/jogos/bracket/salvar', array(
            'methods' => 'POST',
            'callback' => array('Bolao_REST_API', 'handle_salvar_bracket'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/jogos/especiais', array(
            'methods' => 'GET',
            'callback' => array('Bolao_REST_API', 'handle_get_especiais'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/jogos/especiais', array(
            'methods' => 'POST',
            'callback' => array('Bolao_REST_API', 'handle_salvar_especiais'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/jogos/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array('Bolao_REST_API', 'handle_get_jogo_by_id'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/jogos/(?P<id>\d+)/palpite', array(
            'methods' => 'POST',
            'callback' => array('Bolao_REST_API', 'handle_salvar_palpite'),
            'permission_callback' => '__return_true'
        ));

        // ── RANKING ──
        register_rest_route($namespace, '/ranking', array(
            'methods' => 'GET',
            'callback' => array('Bolao_REST_API', 'handle_get_ranking'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/ranking/minha-posicao', array(
            'methods' => 'GET',
            'callback' => array('Bolao_REST_API', 'handle_get_minha_posicao'),
            'permission_callback' => '__return_true'
        ));

        // ── ADMINISTRAÇÃO (RESTRICTED) ──
        register_rest_route($namespace, '/admin/jogos', array(
            'methods' => array('POST', 'PUT'),
            'callback' => array('Bolao_REST_API', 'handle_admin_upsert_jogo'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/admin/jogos/(?P<id>\d+)/resultado', array(
            'methods' => 'PUT',
            'callback' => array('Bolao_REST_API', 'handle_admin_resultado_jogo'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/admin/sincronizar-ge', array(
            'methods' => 'POST',
            'callback' => array('Bolao_REST_API', 'handle_admin_sincronizar_ge'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/admin/ranking/recalcular', array(
            'methods' => 'POST',
            'callback' => array('Bolao_REST_API', 'handle_admin_recalcular_ranking'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/admin/ranking/exportar', array(
            'methods' => 'GET',
            'callback' => array('Bolao_REST_API', 'handle_admin_exportar_ranking'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/admin/colaboradores', array(
            'methods' => array('GET', 'POST'),
            'callback' => array('Bolao_REST_API', 'handle_admin_colaboradores'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/admin/colaboradores/(?P<id>\d+)', array(
            'methods' => array('PUT', 'DELETE'),
            'callback' => array('Bolao_REST_API', 'handle_admin_colaborador_by_id'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/admin/colaboradores/(?P<id>\d+)/ativo', array(
            'methods' => 'PATCH',
            'callback' => array('Bolao_REST_API', 'handle_admin_toggle_ativo'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route($namespace, '/admin/colaboradores/importar', array(
            'methods' => 'POST',
            'callback' => array('Bolao_REST_API', 'handle_admin_importar_colaboradores'),
            'permission_callback' => '__return_true'
        ));
    }

    // ============================================================
    // CALLBACKS DE AUTENTICAÇÃO
    // ============================================================

    public static function handle_login($request) {
        global $wpdb;
        $table_colaboradores = Bolao_DB::get_table_name('colaboradores');

        $params = $request->get_json_params();
        if (empty($params)) {
            $params = $request->get_body_params();
        }

        $codigo_funcionario = isset($params['codigo_funcionario']) ? sanitize_text_field($params['codigo_funcionario']) : '';
        $data_nascimento = isset($params['data_nascimento']) ? sanitize_text_field($params['data_nascimento']) : '';

        if (empty($codigo_funcionario) || empty($data_nascimento)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Dados obrigatórios não enviados'), 400);
        }

        $credencial_hash = Bolao_Crypto::hashCredencial($codigo_funcionario, $data_nascimento);

        $colaborador = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_colaboradores WHERE credencial_hash = %s AND ativo = 1 LIMIT 1",
            $credencial_hash
        ));

        if (empty($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Credenciais inválidas'), 401);
        }

        $secret = self::get_jwt_secret();
        $token = Bolao_JWT::sign(array(
            'id' => intval($colaborador->id),
            'role' => $colaborador->role
        ), $secret);

        // Set HttpOnly cookie com fallback seguro para PHP < 7.3
        if (PHP_VERSION_ID >= 70300) {
            setcookie("token", $token, array(
                'expires' => time() + (3600 * 24 * 7),
                'path' => '/',
                'httponly' => true,
                'samesite' => 'Lax',
                'secure' => is_ssl()
            ));
        } else {
            // HACK elegante para injetar SameSite no header do cookie antes do PHP 7.3
            setcookie("token", $token, time() + (3600 * 24 * 7), "/; SameSite=Lax", "", is_ssl(), true);
        }

        $isPrimeiroAcesso = empty($colaborador->apelido) || empty($colaborador->selecao_favorita);

        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Login realizado com sucesso',
            'primeiro_acesso' => $isPrimeiroAcesso,
            'token' => $token, // Também enviamos o token para suporte em chamadas de header
            'colaborador' => array(
                'id' => intval($colaborador->id),
                'nome' => Bolao_Crypto::decryptField($colaborador->nome),
                'apelido' => Bolao_Crypto::decryptField($colaborador->apelido),
                'foto_perfil' => $colaborador->foto_perfil,
                'selecao_favorita' => $colaborador->selecao_favorita,
                'setor' => Bolao_Crypto::decryptField($colaborador->setor),
                'email_corporativo' => Bolao_Crypto::decryptField($colaborador->email_corporativo),
                'role' => $colaborador->role
            )
        ), 200);
    }

    public static function handle_me($request) {
        $colaborador = self::get_authenticated_user($request);
        if (empty($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Não autorizado'), 401);
        }

        return new WP_REST_Response(array(
            'success' => true,
            'colaborador' => array(
                'id' => intval($colaborador->id),
                'nome' => Bolao_Crypto::decryptField($colaborador->nome),
                'apelido' => Bolao_Crypto::decryptField($colaborador->apelido),
                'foto_perfil' => $colaborador->foto_perfil,
                'selecao_favorita' => $colaborador->selecao_favorita,
                'setor' => Bolao_Crypto::decryptField($colaborador->setor),
                'email_corporativo' => Bolao_Crypto::decryptField($colaborador->email_corporativo),
                'role' => $colaborador->role
            )
        ), 200);
    }

    public static function handle_primeiro_acesso($request) {
        global $wpdb;
        $table_colaboradores = Bolao_DB::get_table_name('colaboradores');

        $colaborador = self::get_authenticated_user($request);
        if (empty($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Não autorizado'), 401);
        }

        $params = $request->get_body_params();
        $apelido = isset($params['apelido']) ? sanitize_text_field($params['apelido']) : '';
        $selecao_favorita = isset($params['selecao_favorita']) ? sanitize_text_field($params['selecao_favorita']) : '';

        if (empty($apelido) || empty($selecao_favorita)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Apelido e Seleção Favorita são obrigatórios'), 400);
        }

        // Validação de Apelido Único
        $apelido_hash = Bolao_Crypto::encryptField($apelido); // Encriptado AES
        // Para verificar se apelido existe, descriptografamos em memória
        $existing_apelidos = $wpdb->get_results("SELECT id, apelido FROM $table_colaboradores WHERE id != {$colaborador->id}");
        foreach ($existing_apelidos as $ea) {
            $dec_apelido = Bolao_Crypto::decryptField($ea->apelido);
            if (!empty($dec_apelido) && strtolower($dec_apelido) === strtolower($apelido)) {
                return new WP_REST_Response(array('success' => false, 'error' => 'Este apelido já está em uso'), 400);
            }
        }

        $foto_url = $colaborador->foto_perfil;

        // Lidar com upload de Imagem usando biblioteca nativa do WordPress
        if ( ! empty( $_FILES['foto'] ) && ! empty( $_FILES['foto']['name'] ) ) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
            require_once ABSPATH . 'wp-admin/includes/media.php';
            require_once ABSPATH . 'wp-admin/includes/image.php';

            $attachment_id = media_handle_upload( 'foto', 0 );
            if ( ! is_wp_error( $attachment_id ) ) {
                $foto_url = wp_get_attachment_url( $attachment_id );
            } else {
                return new WP_REST_Response(array('success' => false, 'error' => 'Erro ao processar imagem de perfil: ' . $attachment_id->get_error_message()), 400);
            }
        }

        $wpdb->update(
            $table_colaboradores,
            array(
                'apelido' => Bolao_Crypto::encryptField($apelido),
                'selecao_favorita' => $selecao_favorita,
                'foto_perfil' => $foto_url
            ),
            array('id' => $colaborador->id)
        );

        return new WP_REST_Response(array('success' => true, 'message' => 'Primeiro acesso concluído com sucesso!'), 200);
    }

    public static function handle_editar_perfil($request) {
        global $wpdb;
        $table_colaboradores = Bolao_DB::get_table_name('colaboradores');

        $colaborador = self::get_authenticated_user($request);
        if (empty($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Não autorizado'), 401);
        }

        $params = $request->get_body_params();
        $apelido = isset($params['apelido']) ? sanitize_text_field($params['apelido']) : '';
        $selecao_favorita = isset($params['selecao_favorita']) ? sanitize_text_field($params['selecao_favorita']) : '';

        if (empty($apelido) || empty($selecao_favorita)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Apelido e Seleção Favorita são obrigatórios'), 400);
        }

        // Validação de Apelido Único
        $existing_apelidos = $wpdb->get_results("SELECT id, apelido FROM $table_colaboradores WHERE id != {$colaborador->id}");
        foreach ($existing_apelidos as $ea) {
            $dec_apelido = Bolao_Crypto::decryptField($ea->apelido);
            if (!empty($dec_apelido) && strtolower($dec_apelido) === strtolower($apelido)) {
                return new WP_REST_Response(array('success' => false, 'error' => 'Este apelido já está em uso'), 400);
            }
        }

        $foto_url = $colaborador->foto_perfil;

        if ( ! empty( $_FILES['foto'] ) && ! empty( $_FILES['foto']['name'] ) ) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
            require_once ABSPATH . 'wp-admin/includes/media.php';
            require_once ABSPATH . 'wp-admin/includes/image.php';

            $attachment_id = media_handle_upload( 'foto', 0 );
            if ( ! is_wp_error( $attachment_id ) ) {
                $foto_url = wp_get_attachment_url( $attachment_id );
            }
        }

        $wpdb->update(
            $table_colaboradores,
            array(
                'apelido' => Bolao_Crypto::encryptField($apelido),
                'selecao_favorita' => $selecao_favorita,
                'foto_perfil' => $foto_url
            ),
            array('id' => $colaborador->id)
        );

        return new WP_REST_Response(array('success' => true, 'message' => 'Perfil atualizado com sucesso!'), 200);
    }

    // ============================================================
    // CALLBACKS DE JOGOS E PALPITES
    // ============================================================

    public static function handle_get_jogos($request) {
        global $wpdb;
        $table_jogos = Bolao_DB::get_table_name('jogos');
        $table_palpites = Bolao_DB::get_table_name('palpites');

        $colaborador = self::get_authenticated_user($request);
        if (empty($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Não autorizado'), 401);
        }

        $jogos = $wpdb->get_results("SELECT * FROM $table_jogos ORDER BY data_hora ASC");

        $meus_palpites = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table_palpites WHERE colaborador_id = %d",
            $colaborador->id
        ));

        $palpites_map = array();
        foreach ($meus_palpites as $p) {
            $palpites_map[$p->jogo_id] = $p;
        }

        $result = array();
        foreach ($jogos as $j) {
            $palpite = isset($palpites_map[$j->id]) ? $palpites_map[$j->id] : null;
            $result[] = array(
                'id' => intval($j->id),
                'fase' => $j->fase,
                'rodada' => $j->rodada !== null ? intval($j->rodada) : null,
                'time_a' => $j->time_a,
                'time_b' => $j->time_b,
                'data_hora' => $j->data_hora,
                'status' => $j->status,
                'placar_a' => $j->placar_a !== null ? intval($j->placar_a) : null,
                'placar_b' => $j->placar_b !== null ? intval($j->placar_b) : null,
                'classificado' => $j->classificado,
                'encerramento_palpite' => $j->encerramento_palpite,
                'palpite' => $palpite ? array(
                    'id' => intval($palpite->id),
                    'palpite_a' => $palpite->palpite_a !== null ? intval($palpite->palpite_a) : null,
                    'palpite_b' => $palpite->palpite_b !== null ? intval($palpite->palpite_b) : null,
                    'time_classificado_palpite' => $palpite->time_classificado_palpite,
                    'confronto_time_a' => $palpite->confronto_time_a,
                    'confronto_time_b' => $palpite->confronto_time_b,
                    'pontos' => intval($palpite->pontos)
                ) : null
            );
        }

        return new WP_REST_Response(array('success' => true, 'jogos' => $result), 200);
    }

    public static function handle_get_meus_resultados($request) {
        global $wpdb;
        $table_jogos = Bolao_DB::get_table_name('jogos');
        $table_palpites = Bolao_DB::get_table_name('palpites');

        $colaborador = self::get_authenticated_user($request);
        if (empty($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Não autorizado'), 401);
        }

        $jogos = $wpdb->get_results("SELECT * FROM $table_jogos WHERE status = 'pontuado' ORDER BY data_hora DESC");

        $meus_palpites = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table_palpites WHERE colaborador_id = %d",
            $colaborador->id
        ));

        $palpites_map = array();
        foreach ($meus_palpites as $p) {
            $palpites_map[$p->jogo_id] = $p;
        }

        $result = array();
        foreach ($jogos as $j) {
            $palpite = isset($palpites_map[$j->id]) ? $palpites_map[$j->id] : null;
            $result[] = array(
                'id' => intval($j->id),
                'fase' => $j->fase,
                'rodada' => $j->rodada !== null ? intval($j->rodada) : null,
                'time_a' => $j->time_a,
                'time_b' => $j->time_b,
                'placar_a' => intval($j->placar_a),
                'placar_b' => intval($j->placar_b),
                'classificado' => $j->classificado,
                'palpite' => $palpite ? array(
                    'palpite_a' => $palpite->palpite_a !== null ? intval($palpite->palpite_a) : null,
                    'palpite_b' => $palpite->palpite_b !== null ? intval($palpite->palpite_b) : null,
                    'time_classificado_palpite' => $palpite->time_classificado_palpite,
                    'pontos' => intval($palpite->pontos),
                    'acertou_placar' => (bool)$palpite->acertou_placar,
                    'acertou_resultado' => (bool)$palpite->acertou_resultado
                ) : null
            );
        }

        return new WP_REST_Response(array('success' => true, 'resultados' => $result), 200);
    }

    public static function handle_get_bracket($request) {
        global $wpdb;
        $table_palpites = Bolao_DB::get_table_name('palpites');
        $table_jogos = Bolao_DB::get_table_name('jogos');

        $colaborador = self::get_authenticated_user($request);
        if (empty($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Não autorizado'), 401);
        }

        // Buscar palpites do usuário apenas de jogos de Mata-Mata (Oitavas em diante)
        $palpites = $wpdb->get_results($wpdb->prepare("
            SELECT p.* 
            FROM $table_palpites p
            INNER JOIN $table_jogos j ON j.id = p.jogo_id
            WHERE p.colaborador_id = %d AND j.fase NOT LIKE '%%Grupo%%' AND j.fase NOT LIKE '%%16avos%%'
        ", $colaborador->id));

        return new WP_REST_Response(array('success' => true, 'bracket' => $palpites), 200);
    }

    public static function handle_salvar_bracket($request) {
        global $wpdb;
        $table_palpites = Bolao_DB::get_table_name('palpites');
        $table_jogos = Bolao_DB::get_table_name('jogos');
        $table_colaboradores = Bolao_DB::get_table_name('colaboradores');

        $colaborador = self::get_authenticated_user($request);
        if (empty($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Não autorizado'), 401);
        }

        $params = $request->get_json_params();
        if (empty($params)) {
            $params = $request->get_body_params();
        }

        $palpites = isset($params['palpites']) ? $params['palpites'] : array();

        if (empty($palpites) || !is_array($palpites)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Nenhum palpite enviado'), 400);
        }

        // Bloqueio de Trapaça: Verifica se o primeiro jogo do Mata-mata já iniciou
        $primeiroJogoMataMata = $wpdb->get_row("
            SELECT encerramento_palpite, data_hora 
            FROM $table_jogos 
            WHERE fase NOT LIKE '%%Grupo%%' AND fase NOT LIKE '%%16avos%%' 
            ORDER BY data_hora ASC LIMIT 1
        ");

        if (!empty($primeiroJogoMataMata)) {
            $limite = strtotime($primeiroJogoMataMata->encerramento_palpite);
            if (time() > $limite) {
                return new WP_REST_Response(array('success' => false, 'error' => 'O prazo de envio do Bracket expirou (Mata-mata já começou).'), 403);
            }
        }

        foreach ($palpites as $p) {
            $jogo_id = intval($p['jogo_id']);
            $palpite_a = isset($p['palpite_a']) ? intval($p['palpite_a']) : null;
            $palpite_b = isset($p['palpite_b']) ? intval($p['palpite_b']) : null;
            $classificado = isset($p['time_classificado_palpite']) ? sanitize_text_field($p['time_classificado_palpite']) : null;
            $confronto_a = isset($p['confronto_time_a']) ? sanitize_text_field($p['confronto_time_a']) : null;
            $confronto_b = isset($p['confronto_time_b']) ? sanitize_text_field($p['confronto_time_b']) : null;

            // Insere ou atualiza o palpite do Mata-Mata
            $wpdb->query($wpdb->prepare("
                INSERT INTO $table_palpites 
                (colaborador_id, jogo_id, palpite_a, palpite_b, time_classificado_palpite, confronto_time_a, confronto_time_b)
                VALUES (%d, %d, %d, %d, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    palpite_a = VALUES(palpite_a),
                    palpite_b = VALUES(palpite_b),
                    time_classificado_palpite = VALUES(time_classificado_palpite),
                    confronto_time_a = VALUES(confronto_time_a),
                    confronto_time_b = VALUES(confronto_time_b)
            ", $colaborador->id, $jogo_id, $palpite_a, $palpite_b, $classificado, $confronto_a, $confronto_b));
        }

        // Marca bracket como salvo
        $wpdb->update($table_colaboradores, array('bracket_mata_mata_salvo' => 1), array('id' => $colaborador->id));

        return new WP_REST_Response(array('success' => true, 'message' => 'Bracket do Mata-mata salvo com sucesso!'), 200);
    }

    public static function handle_get_especiais($request) {
        return new WP_REST_Response(array('success' => true, 'message' => 'Funcionalidade desativada conforme especificações.'), 200);
    }

    public static function handle_salvar_especiais($request) {
        return new WP_REST_Response(array('success' => false, 'error' => 'Funcionalidade desativada.'), 403);
    }

    public static function handle_get_jogo_by_id($request) {
        global $wpdb;
        $table_jogos = Bolao_DB::get_table_name('jogos');

        $jogo_id = intval($request['id']);
        $jogo = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_jogos WHERE id = %d", $jogo_id));

        if (empty($jogo)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Jogo não encontrado'), 404);
        }

        return new WP_REST_Response(array('success' => true, 'jogo' => $jogo), 200);
    }

    public static function handle_salvar_palpite($request) {
        global $wpdb;
        $table_jogos = Bolao_DB::get_table_name('jogos');
        $table_palpites = Bolao_DB::get_table_name('palpites');

        $colaborador = self::get_authenticated_user($request);
        if (empty($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Não autorizado'), 401);
        }

        $jogo_id = intval($request['id']);
        $params = $request->get_json_params();
        if (empty($params)) {
            $params = $request->get_body_params();
        }

        $palpite_a = isset($params['palpite_a']) ? intval($params['palpite_a']) : null;
        $palpite_b = isset($params['palpite_b']) ? intval($params['palpite_b']) : null;
        
        // Mapear compatibilidade de classificado (tanto 'classificado' quanto 'time_classificado_palpite')
        $classificado = null;
        if (isset($params['time_classificado_palpite'])) {
            $classificado = sanitize_text_field($params['time_classificado_palpite']);
        } elseif (isset($params['classificado'])) {
            $classificado = sanitize_text_field($params['classificado']);
        }

        if ($palpite_a === null || $palpite_b === null) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Placares vazios'), 400);
        }

        $jogo = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_jogos WHERE id = %d", $jogo_id));
        if (empty($jogo)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Jogo não encontrado'), 404);
        }

        // Verifica se o tempo limite já expirou
        if (time() > strtotime($jogo->encerramento_palpite) || $jogo->status !== 'aberto') {
            return new WP_REST_Response(array('success' => false, 'error' => 'Os palpites para este jogo já estão encerrados.'), 403);
        }

        // Insere ou atualiza o palpite do colaborador para este jogo
        $wpdb->query($wpdb->prepare("
            INSERT INTO $table_palpites (colaborador_id, jogo_id, palpite_a, palpite_b, time_classificado_palpite)
            VALUES (%d, %d, %d, %d, %s)
            ON DUPLICATE KEY UPDATE
                palpite_a = VALUES(palpite_a),
                palpite_b = VALUES(palpite_b),
                time_classificado_palpite = VALUES(time_classificado_palpite)
        ", $colaborador->id, $jogo_id, $palpite_a, $palpite_b, $classificado));

        return new WP_REST_Response(array('success' => true, 'message' => 'Palpite salvo com sucesso!'), 200);
    }

    // ============================================================
    // CALLBACKS DE RANKING
    // ============================================================

    public static function handle_get_ranking($request) {
        global $wpdb;
        $table_ranking = Bolao_DB::get_table_name('ranking');
        $table_colaboradores = Bolao_DB::get_table_name('colaboradores');

        $colaborador = self::get_authenticated_user($request);
        if (empty($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Não autorizado'), 401);
        }

        // Trazer todos para processamento e filtragem
        $ranking = $wpdb->get_results("
            SELECT r.*, c.nome, c.apelido, c.foto_perfil, c.setor, c.unidade, c.selecao_favorita
            FROM $table_ranking r
            INNER JOIN $table_colaboradores c ON c.id = r.colaborador_id
            ORDER BY r.posicao ASC
        ");

        $result = array();
        foreach ($ranking as $r) {
            $result[] = array(
                'colaborador_id' => intval($r->colaborador_id),
                'posicao' => intval($r->posicao),
                'pontos_total' => intval($r->pontos_total),
                'placares_exatos' => intval($r->placares_exatos),
                'acertos_resultado' => intval($r->acertos_resultado),
                'erros' => intval($r->erros),
                'palpites_feitos' => intval($r->palpites_feitos),
                'colaborador' => array(
                    'nome' => Bolao_Crypto::decryptField($r->nome),
                    'apelido' => Bolao_Crypto::decryptField($r->apelido),
                    'foto_perfil' => $r->foto_perfil,
                    'setor' => Bolao_Crypto::decryptField($r->setor),
                    'unidade' => Bolao_Crypto::decryptField($r->unidade),
                    'selecao_favorita' => $r->selecao_favorita
                )
            );
        }

        // Separa Top 10 + Últimos 4 conforme regras de negócios do MVP
        $top10 = array_slice($result, 0, 10);
        $ultimos4 = count($result) > 10 ? array_slice($result, -4) : array();

        return new WP_REST_Response(array(
            'success' => true,
            'ranking' => $result,
            'top10' => $top10,
            'ultimos4' => $ultimos4
        ), 200);
    }

    public static function handle_get_minha_posicao($request) {
        global $wpdb;
        $table_ranking = Bolao_DB::get_table_name('ranking');
        $table_colaboradores = Bolao_DB::get_table_name('colaboradores');

        $colaborador = self::get_authenticated_user($request);
        if (empty($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Não autorizado'), 401);
        }

        $r = $wpdb->get_row($wpdb->prepare("
            SELECT r.*, c.nome, c.apelido, c.foto_perfil, c.setor, c.unidade, c.selecao_favorita
            FROM $table_ranking r
            INNER JOIN $table_colaboradores c ON c.id = r.colaborador_id
            WHERE r.colaborador_id = %d LIMIT 1
        ", $colaborador->id));

        if (empty($r)) {
            return new WP_REST_Response(array(
                'success' => true,
                'minhaPosicao' => null
            ), 200);
        }

        return new WP_REST_Response(array(
            'success' => true,
            'minhaPosicao' => array(
                'colaborador_id' => intval($r->colaborador_id),
                'posicao' => intval($r->posicao),
                'pontos_total' => intval($r->pontos_total),
                'placares_exatos' => intval($r->placares_exatos),
                'acertos_resultado' => intval($r->acertos_resultado),
                'erros' => intval($r->erros),
                'palpites_feitos' => intval($r->palpites_feitos),
                'colaborador' => array(
                    'nome' => Bolao_Crypto::decryptField($r->nome),
                    'apelido' => Bolao_Crypto::decryptField($r->apelido),
                    'foto_perfil' => $r->foto_perfil,
                    'setor' => Bolao_Crypto::decryptField($r->setor),
                    'unidade' => Bolao_Crypto::decryptField($r->unidade),
                    'selecao_favorita' => $r->selecao_favorita
                )
            )
        ), 200);
    }

    // ============================================================
    // CALLBACKS DE ADMINISTRAÇÃO
    // ============================================================

    public static function handle_admin_upsert_jogo($request) {
        global $wpdb;
        $table_jogos = Bolao_DB::get_table_name('jogos');

        $colaborador = self::get_authenticated_user($request);
        if (!self::is_admin_user($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Acesso negado'), 403);
        }

        $params = $request->get_json_params();
        if (empty($params)) {
            $params = $request->get_body_params();
        }

        $jogo_id = intval($request['id']); // preenchido se for PUT

        $fase = isset($params['fase']) ? sanitize_text_field($params['fase']) : '';
        $rodada = isset($params['rodada']) && $params['rodada'] !== '' ? intval($params['rodada']) : null;
        $time_a = isset($params['time_a']) ? sanitize_text_field($params['time_a']) : '';
        $time_b = isset($params['time_b']) ? sanitize_text_field($params['time_b']) : '';
        $data_hora = isset($params['data_hora']) ? sanitize_text_field($params['data_hora']) : '';
        $encerramento_palpite = isset($params['encerramento_palpite']) ? sanitize_text_field($params['encerramento_palpite']) : '';

        if (empty($fase) || empty($time_a) || empty($time_b) || empty($data_hora) || empty($encerramento_palpite)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Campos obrigatórios ausentes'), 400);
        }

        $data = array(
            'fase' => $fase,
            'rodada' => $rodada,
            'time_a' => $time_a,
            'time_b' => $time_b,
            'data_hora' => $data_hora,
            'encerramento_palpite' => $encerramento_palpite
        );

        if (!empty($jogo_id)) {
            $wpdb->update($table_jogos, $data, array('id' => $jogo_id));
            return new WP_REST_Response(array('success' => true, 'message' => 'Jogo atualizado!'), 200);
        } else {
            $data['status'] = 'aberto';
            $wpdb->insert($table_jogos, $data);
            return new WP_REST_Response(array('success' => true, 'message' => 'Jogo cadastrado!'), 201);
        }
    }

    public static function handle_admin_resultado_jogo($request) {
        global $wpdb;
        $table_jogos = Bolao_DB::get_table_name('jogos');

        $colaborador = self::get_authenticated_user($request);
        if (!self::is_admin_user($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Acesso negado'), 403);
        }

        $jogo_id = intval($request['id']);
        $params = $request->get_json_params();
        if (empty($params)) {
            $params = $request->get_body_params();
        }

        $placar_a = isset($params['placar_a']) ? intval($params['placar_a']) : null;
        $placar_b = isset($params['placar_b']) ? intval($params['placar_b']) : null;
        $classificado = isset($params['classificado']) ? sanitize_text_field($params['classificado']) : null;

        if ($placar_a === null || $placar_b === null) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Placares finais obrigatórios'), 400);
        }

        // Salvar resultado real no jogo
        $wpdb->update(
            $table_jogos,
            array(
                'placar_a' => $placar_a,
                'placar_b' => $placar_b,
                'classificado' => $classificado,
                'status' => 'encerrado'
            ),
            array('id' => $jogo_id)
        );

        // Pontuar todos palpites automaticamente
        try {
            Bolao_Pontuacao::pontuarJogo($jogo_id);
            return new WP_REST_Response(array('success' => true, 'message' => 'Resultado salvo e pontuações calculadas!'), 200);
        } catch (Exception $e) {
            return new WP_REST_Response(array('success' => false, 'error' => $e->getMessage()), 500);
        }
    }

    public static function handle_admin_sincronizar_ge($request) {
        $colaborador = self::get_authenticated_user($request);
        if (!self::is_admin_user($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Acesso negado'), 403);
        }

        $res = Bolao_GE_Sync::sincronizarPlacaresGE();
        if ($res['success']) {
            return new WP_REST_Response(array('success' => true, 'message' => "Sincronização executada! {$res['atualizados']} jogos atualizados."), 200);
        } else {
            return new WP_REST_Response(array('success' => false, 'error' => 'Erro durante a sincronização com o GE'), 500);
        }
    }

    public static function handle_admin_recalcular_ranking($request) {
        $colaborador = self::get_authenticated_user($request);
        if (!self::is_admin_user($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Acesso negado'), 403);
        }

        try {
            Bolao_Pontuacao::recalcularRanking();
            return new WP_REST_Response(array('success' => true, 'message' => 'Ranking recalculado com sucesso!'), 200);
        } catch (Exception $e) {
            return new WP_REST_Response(array('success' => false, 'error' => $e->getMessage()), 500);
        }
    }

    public static function handle_admin_exportar_ranking($request) {
        global $wpdb;
        $table_ranking = Bolao_DB::get_table_name('ranking');
        $table_colaboradores = Bolao_DB::get_table_name('colaboradores');

        $colaborador = self::get_authenticated_user($request);
        if (!self::is_admin_user($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Acesso negado'), 403);
        }

        $rows = $wpdb->get_results("
            SELECT 
              r.posicao, c.nome, c.apelido, c.setor, c.unidade,
              r.pontos_total, r.placares_exatos, r.acertos_resultado, r.erros, r.palpites_feitos
            FROM $table_ranking r
            INNER JOIN $table_colaboradores c ON c.id = r.colaborador_id
            ORDER BY r.posicao ASC
        ");

        $escapeCsv = function($str) {
            if ($str === null) return '';
            $s = strval($str);
            if (preg_match('/^[=+\-@\t\r]/', $s)) $s = "'" . $s;
            return '"' . str_replace('"', '""', $s) . '"';
        };

        $csv = "Posicao,Nome,Apelido,Setor,Unidade,Pontos,PlacaresExatos,AcertosResultado,Erros,PalpitesFeitos\n";
        foreach ($rows as $r) {
            $csv .= $r->posicao . ',' .
                    $escapeCsv(Bolao_Crypto::decryptField($r->nome)) . ',' .
                    $escapeCsv(Bolao_Crypto::decryptField($r->apelido)) . ',' .
                    $escapeCsv(Bolao_Crypto::decryptField($r->setor)) . ',' .
                    $escapeCsv(Bolao_Crypto::decryptField($r->unidade)) . ',' .
                    $r->pontos_total . ',' .
                    $r->placares_exatos . ',' .
                    $r->acertos_resultado . ',' .
                    $r->erros . ',' .
                    $r->palpites_feitos . "\n";
        }

        // Servir download do CSV diretamente nas APIs de REST
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="ranking-bolao-2026.csv"');
        echo "\xEF\xBB\xBF"; // UTF-8 BOM
        echo $csv;
        exit;
    }

    public static function handle_admin_colaboradores($request) {
        global $wpdb;
        $table_colaboradores = Bolao_DB::get_table_name('colaboradores');

        $colaborador = self::get_authenticated_user($request);
        if (!self::is_admin_user($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Acesso negado'), 403);
        }

        if ($request->get_method() === 'GET') {
            // Listagem de colaboradores
            $rows = $wpdb->get_results("SELECT * FROM $table_colaboradores");
            $colaboradores = array();
            foreach ($rows as $r) {
                $colaboradores[] = array(
                    'id' => intval($r->id),
                    'codigo_funcionario' => Bolao_Crypto::decryptField($r->codigo_funcionario),
                    'nome' => Bolao_Crypto::decryptField($r->nome),
                    'data_nascimento' => Bolao_Crypto::decryptField($r->data_nascimento),
                    'setor' => Bolao_Crypto::decryptField($r->setor),
                    'unidade' => Bolao_Crypto::decryptField($r->unidade),
                    'apelido' => Bolao_Crypto::decryptField($r->apelido),
                    'email_corporativo' => Bolao_Crypto::decryptField($r->email_corporativo),
                    'foto_perfil' => $r->foto_perfil,
                    'ativo' => intval($r->ativo),
                    'role' => $r->role
                );
            }

            // Ordenar em memória pois os nomes estão criptografados
            usort($colaboradores, function($a, $b) {
                return strcasecmp($a['nome'] ?: '', $b['nome'] ?: '');
            });

            return new WP_REST_Response(array('success' => true, 'colaboradores' => $colaboradores), 200);
        } else {
            // Criação Manual de Colaborador
            $params = $request->get_json_params();
            if (empty($params)) {
                $params = $request->get_body_params();
            }

            $codigo = isset($params['codigo_funcionario']) ? sanitize_text_field($params['codigo_funcionario']) : '';
            $nome = isset($params['nome']) ? sanitize_text_field($params['nome']) : '';
            $data_nascimento = isset($params['data_nascimento']) ? sanitize_text_field($params['data_nascimento']) : '';
            $setor = isset($params['setor']) ? sanitize_text_field($params['setor']) : '';
            $unidade = isset($params['unidade']) ? sanitize_text_field($params['unidade']) : '';
            $apelido = isset($params['apelido']) ? sanitize_text_field($params['apelido']) : '';
            $email = isset($params['email_corporativo']) ? sanitize_text_field($params['email_corporativo']) : '';
            $role = isset($params['role']) ? sanitize_text_field($params['role']) : 'USER';

            if (empty($codigo) || empty($nome) || empty($data_nascimento)) {
                return new WP_REST_Response(array('success' => false, 'error' => 'Código, Nome e Data Nascimento são obrigatórios'), 400);
            }

            // Validação de duplicados (em memória devido à criptografia GCM)
            $existing_users = $wpdb->get_results("SELECT codigo_funcionario FROM $table_colaboradores");
            foreach ($existing_users as $eu) {
                if (Bolao_Crypto::decryptField($eu->codigo_funcionario) === $codigo) {
                    return new WP_REST_Response(array('success' => false, 'error' => 'Já existe um colaborador com esse código'), 400);
                }
            }

            $credHash = Bolao_Crypto::hashCredencial($codigo, $data_nascimento);

            $wpdb->insert($table_colaboradores, array(
                'codigo_funcionario' => Bolao_Crypto::encryptField($codigo),
                'nome' => Bolao_Crypto::encryptField($nome),
                'data_nascimento' => Bolao_Crypto::encryptField($data_nascimento),
                'credencial_hash' => $credHash,
                'setor' => Bolao_Crypto::encryptField($setor),
                'unidade' => Bolao_Crypto::encryptField($unidade),
                'apelido' => Bolao_Crypto::encryptField($apelido),
                'email_corporativo' => Bolao_Crypto::encryptField($email),
                'role' => $role,
                'ativo' => 1
            ));

            return new WP_REST_Response(array('success' => true, 'message' => 'Colaborador criado com sucesso!'), 201);
        }
    }

    public static function handle_admin_colaborador_by_id($request) {
        global $wpdb;
        $table_colaboradores = Bolao_DB::get_table_name('colaboradores');

        $colaborador = self::get_authenticated_user($request);
        if (!self::is_admin_user($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Acesso negado'), 403);
        }

        $id = intval($request['id']);

        if ($request->get_method() === 'DELETE') {
            // Excluir Colaborador
            $wpdb->delete($table_colaboradores, array('id' => $id));
            return new WP_REST_Response(array('success' => true, 'message' => 'Colaborador excluído permanentemente.'), 200);
        } else {
            // Editar Colaborador
            $params = $request->get_json_params();
            if (empty($params)) {
                $params = $request->get_body_params();
            }

            $codigo = isset($params['codigo_funcionario']) ? sanitize_text_field($params['codigo_funcionario']) : '';
            $nome = isset($params['nome']) ? sanitize_text_field($params['nome']) : '';
            $data_nascimento = isset($params['data_nascimento']) ? sanitize_text_field($params['data_nascimento']) : '';
            $setor = isset($params['setor']) ? sanitize_text_field($params['setor']) : '';
            $unidade = isset($params['unidade']) ? sanitize_text_field($params['unidade']) : '';
            $apelido = isset($params['apelido']) ? sanitize_text_field($params['apelido']) : '';
            $email = isset($params['email_corporativo']) ? sanitize_text_field($params['email_corporativo']) : '';
            $role = isset($params['role']) ? sanitize_text_field($params['role']) : 'USER';

            if (empty($codigo) || empty($nome) || empty($data_nascimento)) {
                return new WP_REST_Response(array('success' => false, 'error' => 'Código, Nome e Data Nascimento são obrigatórios'), 400);
            }

            $credHash = Bolao_Crypto::hashCredencial($codigo, $data_nascimento);

            $wpdb->update($table_colaboradores, array(
                'codigo_funcionario' => Bolao_Crypto::encryptField($codigo),
                'nome' => Bolao_Crypto::encryptField($nome),
                'data_nascimento' => Bolao_Crypto::encryptField($data_nascimento),
                'credencial_hash' => $credHash,
                'setor' => Bolao_Crypto::encryptField($setor),
                'unidade' => Bolao_Crypto::encryptField($unidade),
                'apelido' => Bolao_Crypto::encryptField($apelido),
                'email_corporativo' => Bolao_Crypto::encryptField($email),
                'role' => $role
            ), array('id' => $id));

            return new WP_REST_Response(array('success' => true, 'message' => 'Colaborador atualizado com sucesso!'), 200);
        }
    }

    public static function handle_admin_toggle_ativo($request) {
        global $wpdb;
        $table_colaboradores = Bolao_DB::get_table_name('colaboradores');

        $colaborador = self::get_authenticated_user($request);
        if (!self::is_admin_user($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Acesso negado'), 403);
        }

        $id = intval($request['id']);
        $params = $request->get_json_params();
        if (empty($params)) {
            $params = $request->get_body_params();
        }

        $ativo = isset($params['ativo']) ? intval($params['ativo']) : 0;

        $wpdb->update($table_colaboradores, array('ativo' => $ativo), array('id' => $id));

        return new WP_REST_Response(array('success' => true, 'message' => 'Status do colaborador atualizado.'), 200);
    }

    public static function handle_admin_importar_colaboradores($request) {
        global $wpdb;
        $table_colaboradores = Bolao_DB::get_table_name('colaboradores');

        $colaborador = self::get_authenticated_user($request);
        if (!self::is_admin_user($colaborador)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Acesso negado'), 403);
        }

        if (empty($_FILES['planilha']) || empty($_FILES['planilha']['tmp_name'])) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Envie uma planilha CSV válida'), 400);
        }

        // Portamos de Excel (.xlsx) para CSV nativo por ser imensamente mais performático e nativo no PHP
        $file = $_FILES['planilha']['tmp_name'];
        
        $handle = fopen($file, 'r');
        if (!$handle) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Erro ao abrir o arquivo importado'), 500);
        }

        $cadastrados = 0;
        $atualizados = 0;
        $erros = 0;
        $logErros = array();

        // 1. Carregar colaboradores existentes em Map para performance excepcional em lote
        $existing_users = $wpdb->get_results("SELECT id, codigo_funcionario FROM $table_colaboradores");
        $colaboradoresMap = array();
        foreach ($existing_users as $eu) {
            $dec_codigo = Bolao_Crypto::decryptField($eu->codigo_funcionario);
            if (!empty($dec_codigo)) {
                $colaboradoresMap[$dec_codigo] = intval($eu->id);
            }
        }

        $row_index = 0;
        $header = array();

        while (($row = fgetcsv($handle, 4096, ';')) !== false) {
            $row_index++;
            if ($row_index === 1) {
                // Normaliza o cabeçalho
                $header = array_map('strtolower', array_map('trim', $row));
                continue;
            }

            try {
                // Encontrar colunas corretas baseadas nos nomes
                $idx_codigo = self::find_column_index($header, array('cod', 'matricula', 'registro'));
                $idx_nome = self::find_column_index($header, array('nome', 'funcionario', 'colaborador'));
                $idx_data = self::find_column_index($header, array('nasc', 'data', 'aniversario'));
                $idx_setor = self::find_column_index($header, array('setor', 'dpto', 'departamento', 'area'));
                $idx_unidade = self::find_column_index($header, array('unid', 'filial', 'local', 'estabelecimento'));

                if ($idx_codigo === -1 || $idx_nome === -1 || $idx_data === -1) {
                    throw new Exception('Faltam colunas essenciais: Código, Nome ou Data de Nascimento');
                }

                $codigo = isset($row[$idx_codigo]) ? trim($row[$idx_codigo]) : '';
                $nome = isset($row[$idx_nome]) ? trim($row[$idx_nome]) : '';
                $data_raw = isset($row[$idx_data]) ? trim($row[$idx_data]) : '';
                $setor = ($idx_setor !== -1 && isset($row[$idx_setor])) ? trim($row[$idx_setor]) : null;
                $unidade = ($idx_unidade !== -1 && isset($row[$idx_unidade])) ? trim($row[$idx_unidade]) : null;

                if (empty($codigo) || empty($nome) || empty($data_raw)) {
                    throw new Exception('Campos obrigatórios em branco nesta linha.');
                }

                // Normalizar data (ex: DD/MM/AAAA para AAAA-MM-DD)
                $data_nascimento = self::normalizar_data_csv($data_raw);
                $credHash = Bolao_Crypto::hashCredencial($codigo, $data_nascimento);

                $existingId = isset($colaboradoresMap[$codigo]) ? $colaboradoresMap[$codigo] : null;

                if ($existingId !== null) {
                    $wpdb->update($table_colaboradores, array(
                        'nome' => Bolao_Crypto::encryptField($nome),
                        'data_nascimento' => Bolao_Crypto::encryptField($data_nascimento),
                        'credencial_hash' => $credHash,
                        'setor' => Bolao_Crypto::encryptField($setor),
                        'unidade' => Bolao_Crypto::encryptField($unidade)
                    ), array('id' => $existingId));
                    $atualizados++;
                } else {
                    $wpdb->insert($table_colaboradores, array(
                        'codigo_funcionario' => Bolao_Crypto::encryptField($codigo),
                        'nome' => Bolao_Crypto::encryptField($nome),
                        'data_nascimento' => Bolao_Crypto::encryptField($data_nascimento),
                        'credencial_hash' => $credHash,
                        'setor' => Bolao_Crypto::encryptField($setor),
                        'unidade' => Bolao_Crypto::encryptField($unidade),
                        'ativo' => 1
                    ));
                    // Adicionar ao mapa em memória para evitar inserções duplicadas no mesmo lote
                    $colaboradoresMap[$codigo] = $wpdb->insert_id;
                    $cadastrados++;
                }

            } catch (Exception $e) {
                $erros++;
                $logErros[] = "Linha {$row_index}: " . $e->getMessage();
            }
        }

        fclose($handle);

        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Planilha CSV processada com sucesso!',
            'cadastrados' => $cadastrados,
            'atualizados' => $atualizados,
            'erros' => $erros,
            'logErros' => $logErros
        ), 200);
    }

    private static function find_column_index($header, $patterns) {
        foreach ($header as $i => $h) {
            foreach ($patterns as $p) {
                if (strpos($h, $p) !== false) return $i;
            }
        }
        return -1;
    }

    private static function normalizar_data_csv($val) {
        $clean = trim($val);
        // DD/MM/AAAA
        if (preg_match('/^(\d{1,2})[.-\/](\d{1,2})[.-\/](\d{4})$/', $clean, $matches)) {
            return $matches[3] . '-' . str_pad($matches[2], 2, '0', STR_PAD_LEFT) . '-' . str_pad($matches[1], 2, '0', STR_PAD_LEFT);
        }
        // AAAA-MM-DD
        if (preg_match('/^(\d{4})[.-\/](\d{1,2})[.-\/](\d{1,2})$/', $clean, $matches)) {
            return $matches[1] . '-' . str_pad($matches[2], 2, '0', STR_PAD_LEFT) . '-' . str_pad($matches[3], 2, '0', STR_PAD_LEFT);
        }
        throw new Exception("Formato de data inválido (Use DD/MM/AAAA ou AAAA-MM-DD): {$val}");
    }
}
