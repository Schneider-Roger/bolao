const fs = require('fs');
const path = require('path');

const files = [
  'wordpress-plugin/bolao-copa-2026.php',
  'wordpress-plugin/includes/class-bolao-db.php',
  'wordpress-plugin/includes/class-bolao-crypto.php',
  'wordpress-plugin/includes/class-bolao-pontuacao.php',
  'wordpress-plugin/includes/class-bolao-ge-sync.php',
  'wordpress-plugin/includes/class-bolao-cron.php',
  'wordpress-plugin/includes/class-bolao-rest-api.php'
];

files.forEach(file => {
  const filePath = path.resolve('c:/sistemas/bolao', file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  let openBraces = 0;
  let openParens = 0;
  let openBrackets = 0;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{') openBraces++;
    if (char === '}') openBraces--;
    if (char === '(') openParens++;
    if (char === ')') openParens--;
    if (char === '[') openBrackets++;
    if (char === ']') openBrackets--;
    
    if (openBraces < 0) {
      console.log(`Unmatched close brace '}' in ${file} at char ${i}`);
      openBraces = 0;
    }
    if (openParens < 0) {
      console.log(`Unmatched close paren ')' in ${file} at char ${i}`);
      openParens = 0;
    }
    if (openBrackets < 0) {
      console.log(`Unmatched close bracket ']' in ${file} at char ${i}`);
      openBrackets = 0;
    }
  }
  
  console.log(`${file}: braces=${openBraces}, parens=${openParens}, brackets=${openBrackets}`);
});
