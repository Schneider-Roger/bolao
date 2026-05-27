import * as xlsx from 'xlsx';

try {
  const workbook = xlsx.readFile('base copercana.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  if (data.length > 1) {
    for (let i = 1; i <= 10; i++) {
        console.log(`Depto/Filial original: "${data[i][2]}" -> Limpo: "${String(data[i][2]).replace(/[^a-zA-ZÀ-ÿ\s]/g, '').trim()}"`);
    }
  }
} catch (e) {
  console.error(e);
}
