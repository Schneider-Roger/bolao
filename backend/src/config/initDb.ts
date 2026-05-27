import pool from './db';

const initDb = async () => {
  try {
    const connection = await pool.getConnection();

    await connection.query(`
      CREATE TABLE IF NOT EXISTS colaboradores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo_funcionario TEXT NOT NULL,
        nome TEXT NOT NULL,
        data_nascimento TEXT NOT NULL,
        credencial_hash VARCHAR(64) UNIQUE NOT NULL,
        setor TEXT,
        unidade TEXT,
        foto_perfil VARCHAR(255),
        apelido TEXT,
        selecao_favorita VARCHAR(50),
        ativo BOOLEAN DEFAULT true,
        bracket_mata_mata_salvo BOOLEAN DEFAULT false,
        email_corporativo TEXT,
        role ENUM('USER', 'ADMIN') DEFAULT 'USER'
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS jogos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fase VARCHAR(50) NOT NULL,
        rodada INT,
        time_a VARCHAR(50) NOT NULL,
        time_b VARCHAR(50) NOT NULL,
        data_hora DATETIME NOT NULL,
        status ENUM('aberto', 'fecha_em_breve', 'bloqueado', 'encerrado', 'pontuado') DEFAULT 'aberto',
        placar_a INT,
        placar_b INT,
        classificado VARCHAR(50),
        encerramento_palpite DATETIME
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS palpites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        colaborador_id INT NOT NULL,
        jogo_id INT NOT NULL,
        palpite_a INT,
        palpite_b INT,
        time_classificado_palpite VARCHAR(50),
        confronto_time_a VARCHAR(50),
        confronto_time_b VARCHAR(50),
        acertou_resultado BOOLEAN DEFAULT false,
        acertou_placar BOOLEAN DEFAULT false,
        acertou_confronto BOOLEAN DEFAULT false,
        pontos INT DEFAULT 0,
        FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE,
        FOREIGN KEY (jogo_id) REFERENCES jogos(id) ON DELETE CASCADE,
        UNIQUE KEY unique_palpite (colaborador_id, jogo_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS palpites_especiais (
        id INT AUTO_INCREMENT PRIMARY KEY,
        colaborador_id INT NOT NULL,
        campeao_palpite VARCHAR(50),
        vice_palpite VARCHAR(50),
        terceiro_palpite VARCHAR(50),
        quarto_palpite VARCHAR(50),
        acertou_campeao BOOLEAN DEFAULT false,
        acertou_vice BOOLEAN DEFAULT false,
        acertou_terceiro BOOLEAN DEFAULT false,
        acertou_quarto BOOLEAN DEFAULT false,
        FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE,
        UNIQUE KEY unique_especial (colaborador_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS ranking (
        colaborador_id INT PRIMARY KEY,
        posicao INT,
        pontos_total INT DEFAULT 0,
        placares_exatos INT DEFAULT 0,
        acertos_resultado INT DEFAULT 0,
        erros INT DEFAULT 0,
        palpites_feitos INT DEFAULT 0,
        desempate_campeao BOOLEAN DEFAULT false,
        desempate_vice BOOLEAN DEFAULT false,
        desempate_terceiro BOOLEAN DEFAULT false,
        desempate_quarto BOOLEAN DEFAULT false,
        FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE
      )
    `);

    console.log('Database tables initialized successfully');
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database tables:', error);
    process.exit(1);
  }
};

initDb();
