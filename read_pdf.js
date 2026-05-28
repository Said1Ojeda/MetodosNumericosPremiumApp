const fs = require('fs');
const files = fs.readdirSync('/vercel/sandbox');
const pdfFile = files.find(f => f.endsWith('.pdf'));
const buf = fs.readFileSync('/vercel/sandbox/' + pdfFile);
const str = buf.toString('latin1');

// Try extracting text from PDF stream content
const matches = str.match(/BT[\s\S]*?ET/g) || [];
let text = '';
for (const block of matches) {
  // Match (text) Tj patterns
  const tj = block.match(/\(([^)]*)\)\s*Tj/g) || [];
  for (const t of tj) {
    const m = t.match(/\(([^)]*)\)/);
    if (m) text += m[1] + ' ';
  }
  // Match [(text)] TJ patterns
  const tjArr = block.match(/\[([^\]]*)\]\s*TJ/g) || [];
  for (const t of tjArr) {
    const parts = t.match(/\(([^)]*)\)/g) || [];
    for (const p of parts) {
      text += p.replace(/[()]/g, '') + ' ';
    }
  }
}

if (text.trim().length > 50) {
  console.log('=== PDF TEXT CONTENT ===');
  console.log(text.substring(0, 5000));
} else {
  // Try raw string extraction for readable ASCII
  const readable = str.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ');
  // Find sequences of readable words
  const words = readable.match(/[A-Za-z][A-Za-z0-9\s,.:;()\-]{10,}/g) || [];
  console.log('=== READABLE STRINGS FROM PDF ===');
  console.log(words.slice(0, 100).join('\n').substring(0, 5000));
}
