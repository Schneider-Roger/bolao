import * as xlsx from 'xlsx';

try {
  const workbook = xlsx.readFile('base copercana.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  if (data.length > 0) {
    const headers = data[0];
    headers.forEach((h, i) => console.log(`${i}: ${h}`));
  }
} catch (e) {
  console.error(e);
}
