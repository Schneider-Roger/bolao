<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Bolao_Crypto {
    
    /**
     * Recupera as chaves do wp-config.php e as converte de hexadecimal para binário
     */
    private static function get_keys() {
        // Carrega constantes de segurança definidas no wp-config.php (ou variáveis de ambiente)
        $enc_key_hex = defined('BOLAO_ENCRYPTION_KEY') ? BOLAO_ENCRYPTION_KEY : '';
        $hmac_key_hex = defined('BOLAO_HMAC_KEY') ? BOLAO_HMAC_KEY : '';

        // Tenta obter de ganchos do ambiente se não definidos como constante
        if (empty($enc_key_hex)) {
            $enc_key_hex = getenv('BOLAO_ENCRYPTION_KEY') ?: '';
        }
        if (empty($hmac_key_hex)) {
            $hmac_key_hex = getenv('BOLAO_HMAC_KEY') ?: '';
        }

        // Converter hex para binário
        $encryption_key = !empty($enc_key_hex) ? @hex2bin($enc_key_hex) : '';
        $hmac_key = !empty($hmac_key_hex) ? @hex2bin($hmac_key_hex) : '';

        return array($encryption_key, $hmac_key);
    }

    /**
     * Criptografa uma string usando AES-256-GCM de forma idêntica ao Node.js
     * Formato de retorno: iv_hex:auth_tag_hex:ciphertext_hex
     */
    public static function encrypt($text) {
        if ($text === null || $text === '') return null;
        
        list($encryption_key, ) = self::get_keys();
        if (strlen($encryption_key) !== 32) {
            error_log('Aviso (Bolão): BOLAO_ENCRYPTION_KEY não configurada ou tamanho inválido.');
            return $text; // Retorno em texto puro como fallback de contingência
        }

        $iv = openssl_random_pseudo_bytes(16);
        $tag = '';
        $encrypted = openssl_encrypt($text, 'aes-256-gcm', $encryption_key, OPENSSL_RAW_DATA, $iv, $tag);
        
        return bin2hex($iv) . ':' . bin2hex($tag) . ':' . bin2hex($encrypted);
    }

    /**
     * Descriptografa uma string gerada pelo método encrypt
     */
    public static function decrypt($encryptedText) {
        if (empty($encryptedText) || strpos($encryptedText, ':') === false) {
            return $encryptedText;
        }

        list($encryption_key, ) = self::get_keys();
        if (strlen($encryption_key) !== 32) {
            return $encryptedText;
        }

        try {
            $parts = explode(':', $encryptedText);
            if (count($parts) !== 3) return $encryptedText;

            $iv = @hex2bin($parts[0]);
            $tag = @hex2bin($parts[1]);
            $ciphertext = @hex2bin($parts[2]);

            if ($iv === false || $tag === false || $ciphertext === false) {
                return $encryptedText;
            }

            $decrypted = openssl_decrypt($ciphertext, 'aes-256-gcm', $encryption_key, OPENSSL_RAW_DATA, $iv, $tag);
            return $decrypted === false ? $encryptedText : $decrypted;
        } catch (Exception $e) {
            return $encryptedText;
        }
    }

    /**
     * Gera um HMAC-SHA256 determinístico de forma idêntica ao Node.js
     */
    public static function hmacHash($text) {
        if (empty($text)) return $text;
        
        list($encryption_key, $hmac_key) = self::get_keys();
        $keyToUse = !empty($hmac_key) ? $hmac_key : $encryption_key;
        
        if (empty($keyToUse)) {
            error_log('Aviso (Bolão): Nenhuma chave configurada para geração de hashes.');
            return $text;
        }

        return hash_hmac('sha256', $text, $keyToUse);
    }

    /**
     * Invólucros auxiliares para manipulação nula e tipos de dados
     */
    public static function encryptField($value) {
        if (is_null($value) || $value === '') return null;
        return self::encrypt(strval($value));
    }

    public static function decryptField($value) {
        if (is_null($value) || $value === '') return null;
        return self::decrypt(strval($value));
    }

    public static function hashField($value) {
        if (is_null($value) || $value === '') return null;
        return self::hmacHash(strval($value));
    }

    /**
     * Gera a credencial única composta de forma segura
     */
    public static function hashCredencial($codigo, $nascimento) {
        if (empty($codigo) || empty($nascimento)) return null;
        $cleanCodigo = trim(strval($codigo));
        $cleanNascimento = trim(strval($nascimento));
        return self::hmacHash($cleanCodigo . ':' . $cleanNascimento);
    }
}
