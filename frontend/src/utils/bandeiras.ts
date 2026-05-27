export const getBandeiraUrl = (selecao: string): string => {
    // Mapa para ajustar nomes do banco de dados para o nome do arquivo da imagem local
    const mapaNomes: Record<string, string> = {
        "Bósnia e Herzegovina": "Bósnia",
        "Bósnia & Herzegovina": "Bósnia",
        "Curaçau": "Curaçao",
        "Egipto": "Egito",
        "EUA": "Estados Unidos",
        "RI do Irã": "Irã",
        "RD do Congo": "RD Congo",
        "Congo": "RD Congo",
        "Tchéquia": "República Tcheca",
        "Qatar": "Catar"
    };

    const nomeArquivo = mapaNomes[selecao] || selecao;

    // Retorna o caminho para a pasta local public/bandeiras
    return `/bandeiras/${nomeArquivo}.png`;
};

export const getBandeiraRetangularUrl = (selecao: string): string => {
    const mapaIso: Record<string, string> = {
        "África do Sul": "za", "Alemanha": "de", "Arábia Saudita": "sa", "Argélia": "dz", "Argentina": "ar",
        "Austrália": "au", "Áustria": "at", "Bélgica": "be", "Bósnia e Herzegovina": "ba", "Bósnia & Herzegovina": "ba", "Brasil": "br",
        "Cabo Verde": "cv", "Canadá": "ca", "Catar": "qa", "Qatar": "qa", "Colômbia": "co", "Coreia do Sul": "kr",
        "Costa do Marfim": "ci", "Croácia": "hr", "Curaçau": "cw", "Egipto": "eg", "Equador": "ec",
        "Escócia": "gb-sct", "Espanha": "es", "Estados Unidos": "us", "EUA": "us", "França": "fr", "Gana": "gh",
        "Haiti": "ht", "Holanda": "nl", "Inglaterra": "gb-eng", "Irã": "ir", "RI do Irã": "ir", "Iraque": "iq",
        "Japão": "jp", "Jordânia": "jo", "Marrocos": "ma", "México": "mx", "Noruega": "no",
        "Nova Zelândia": "nz", "Panamá": "pa", "Paraguai": "py", "Portugal": "pt", "RD do Congo": "cd", "Congo": "cd",
        "República Tcheca": "cz", "Tchéquia": "cz", "Senegal": "sn", "Suécia": "se", "Suíça": "ch", "Tunísia": "tn",
        "Turquia": "tr", "Uruguai": "uy", "Uzbequistão": "uz"
    };
    
    const iso = mapaIso[selecao];
    if (iso) {
        return `https://flagcdn.com/w320/${iso}.png`;
    }
    
    return getBandeiraUrl(selecao);
};
