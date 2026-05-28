const fs = require('fs');
const zlib = require('zlib');

const files = fs.readdirSync('/vercel/sandbox');
const pdfFile = files.find(f => f.endsWith('.pdf'));
const buf = fs.readFileSync('/vercel/sandbox/' + pdfFile);

// Find all FlateDecode streams and decompress them
let allText = '';
let pos = 0;
const raw = buf;

// Find stream...endstream blocks
let searchPos = 0;
while (searchPos < raw.length) {
  const streamStart = raw.indexOf(Buffer.from('stream'), searchPos);
  if (streamStart === -1) break;
  
  // Skip 'stream' keyword + newline
  let dataStart = streamStart + 6;
  if (raw[dataStart] === 13) dataStart++; // CR
  if (raw[dataStart] === 10) dataStart++; // LF
  
  const streamEnd = raw.indexOf(Buffer.from('endstream'), dataStart);
  if (streamEnd === -1) break;
  
  const streamData = raw.slice(dataStart, streamEnd);
  
  // Try to decompress
  try {
    const decompressed = zlib.inflateSync(streamData);
    const text = decompressed.toString('utf8');
    // Only keep if it has readable text
    if (/[A-Za-záéíóúñÁÉÍÓÚÑ]{3,}/.test(text)) {
      allText += text + '\n---\n';
    }
  } catch(e) {
    // Not a zlib stream, skip
  }
  
  searchPos = streamEnd + 9;
}

if (allText.length > 100) {
  console.log('=== DECOMPRESSED PDF CONTENT ===');
  // Extract text from PDF operators
  const lines = allText.split('\n');
  let readable = '';
  for (const line of lines) {
    // BT/ET text blocks
    if (line.includes('Tj') || line.includes('TJ')) {
      const parts = line.match(/\(([^)]+)\)/g) || [];
      for (const p of parts) {
        readable += p.replace(/[()]/g, '') + ' ';
      }
    }
  }
  if (readable.length > 50) {
    console.log('TEXT:', readable.substring(0, 6000));
  } else {
    // Print raw decompressed content
    console.log(allText.substring(0, 6000));
  }
} else {
  console.log('Could not extract text. PDF may use embedded fonts or encoding.');
  console.log('File size:', buf.length, 'bytes');
}
