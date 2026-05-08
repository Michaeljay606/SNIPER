import { readFileSync, writeFileSync } from 'fs';

const c = readFileSync('src/App.tsx', 'utf8');

// Replace the broken label syntax with proper string concatenation
const broken = `return R:R 1:+((Math.abs(t-e)/Math.abs(e-s)).toFixed(1)); } return R:R 1:+(signal.rr || '?');`;
const fixed = `return 'R:R 1:' + ((Math.abs(t-e)/Math.abs(e-s)).toFixed(1)); } return 'R:R 1:' + (signal.rr || '?');`;

if (!c.includes(broken)) {
  console.error('Could not find broken pattern!');
  process.exit(1);
}

const newContent = c.replace(broken, fixed);
writeFileSync('src/App.tsx', newContent);
console.log('Fixed R:R calculation successfully');
