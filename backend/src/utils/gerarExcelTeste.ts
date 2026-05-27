import * as XLSX from 'xlsx';
import * as path from 'path';

const gerarPlanilhaTeste = () => {
  try {
    const dados = [
      {
        "Matricula": "10001",
        "Nome": "José da Silva",
        "Data de Nascimento": "15/05/1990",
        "Setor": "Logística",
        "Unidade": "Unidade Matriz"
      },
      {
        "Matricula": "10002",
        "Nome": "Maria Oliveira",
        "Data de Nascimento": "20/08/1992",
        "Setor": "Financeiro",
        "Unidade": "Unidade Filial"
      },
      {
        "Matricula": "10003",
        "Nome": "Carlos Souza",
        "Data de Nascimento": "31/12/1988",
        "Setor": "Recursos Humanos",
        "Unidade": "Unidade Matriz"
      },
      {
        "Matricula": "10004",
        "Nome": "Ana Santos",
        "Data de Nascimento": "25/03/1995",
        "Setor": "Tecnologia",
        "Unidade": "Unidade Filial"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Colaboradores");

    const outputPath = path.resolve(__dirname, '../../../../colaboradores_teste.xlsx');
    XLSX.writeFile(workbook, outputPath);
    console.log(`Planilha de teste criada com sucesso em: ${outputPath}`);
  } catch (error) {
    console.error('Erro ao gerar planilha de teste:', error);
  }
};

gerarPlanilhaTeste();
