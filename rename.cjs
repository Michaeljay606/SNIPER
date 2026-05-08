const fs = require('fs');
const path = require('path');

const replacements = [
  { old: /OnyxTech vous contactera/g, new: "Ephata Tech vous contactera" },
  { old: /POWERED BY ONYXTECH/g, new: "POWERED BY EPHATA TECH" },
  { old: /Bienvenue dans l'Empire\./g, new: "Bienvenue dans l'Empire Ephata." },
  { old: /t\.me\/OnyxTechBot/g, new: "t.me/EphataTechBot" },
  { old: /@OnyxTechSupport/g, new: "@EphataTechSupport" },
  { old: /onyxtech\.vercel\.app/g, new: "ephata-tech.vercel.app" },
  { old: /OnyxTech Terminal/g, new: "Ephata Terminal" },
  { old: /OnyxTechBot/g, new: "EphataTechBot" },
  { old: /ONYX TERMINAL/g, new: "EPHATA TERMINAL" },
  { old: /Onyx Terminal/g, new: "Ephata Terminal" },
  { old: /ONYX-V2\.4/g, new: "EPHATA-V2.4" },
  { old: /Onyx-V2\.4/g, new: "Ephata-V2.4" },
  { old: /OnyxTech/g, new: "Ephata Tech" },
  { old: /ONYXTECH/g, new: "EPHATA TECH" },
  { old: /Onyx Tech/g, new: "Ephata Tech" },
  { old: /ONYX TECH/g, new: "EPHATA TECH" },
  { old: /\bOnyx\b(?!\-master)(?!Badge)(?! Terminal)(?!-V2\.4)/g, new: "Ephata" },
  { old: /\bONYX\b(?!\-master)(?! TERMINAL)(?!-V2\.4)(?!TECH)(?!\-SUB)(?!\-VIP)/g, new: "EPHATA" },
  { old: /VITE_ONYXTECH_WALLET/g, new: "VITE_EPHATA_WALLET" },
  { old: /ONYXTECH_WALLET/g, new: "EPHATA_WALLET" }
];

const walk = function(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        results = results.concat(walk(file));
      }
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.json') || file.endsWith('.md') || file.endsWith('.env')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('.');

let auditReport = {};

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  let modifications = 0;

  // We should NOT touch package-lock.json
  if (file.includes('package-lock.json')) return;

  replacements.forEach(rep => {
    const matches = content.match(rep.old);
    if (matches) {
      modifications += matches.length;
      content = content.replace(rep.old, rep.new);
    }
  });

  // Special Route Replace Task 4
  if (file.includes('src/App.tsx') || file.includes('src\\App.tsx')) {
    const routeMatch = content.match(/\/onyx-master/g);
    if (routeMatch) {
      modifications += routeMatch.length;
      content = content.replace(/\/onyx-master/g, '/ephata-master');
    }
  }

  // Ton Payment Sheet comments (ONYX-SUB -> EPHATA-SUB)
  if (file.includes('src/components/TonPaymentSheet.tsx') || file.includes('src\\components\\TonPaymentSheet.tsx')) {
    const commentMatch = content.match(/ONYX-/g);
    if (commentMatch) {
      modifications += commentMatch.length;
      content = content.replace(/ONYX-/g, 'EPHATA-');
    }
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    auditReport[file] = modifications;
  }
});

console.log(JSON.stringify(auditReport, null, 2));
