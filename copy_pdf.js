const fs = require('fs');
const files = fs.readdirSync('/vercel/sandbox');
const pdfFile = files.find(f => f.endsWith('.pdf'));
fs.copyFileSync('/vercel/sandbox/' + pdfFile, '/tmp/proyecto.pdf');
console.log('Copied:', pdfFile, 'to /tmp/proyecto.pdf');
