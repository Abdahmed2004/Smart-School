/* global require, process */
const fs = require('fs');
const parser = require('@babel/parser');

const bundlePath = 'dist/assets/index-DpwYDBkp.js';
if (!fs.existsSync(bundlePath)) {
  console.error('Bundle not found:', bundlePath);
  process.exit(1);
}

const bundle = fs.readFileSync(bundlePath, 'utf8');
const bundleAst = parser.parse(bundle, { sourceType: 'module' });

const strings = new Set();
const walk = (node) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const n of node) walk(n);
    return;
  }
  if (node.type === 'StringLiteral') {
    strings.add(node.value);
  }
  if (node.type === 'TemplateLiteral') {
    for (const q of node.quasis || []) {
      if (q?.value?.cooked) strings.add(q.value.cooked);
    }
  }
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue;
    walk(node[key]);
  }
};
walk(bundleAst);

const containsArabic = (s) => /[\u0600-\u06FF]/.test(s);
const candidates = [...strings]
  .filter(containsArabic)
  .map((s) => ({
    text: s,
    key: (s.match(/[\u0600-\u06FF]/g) || []).join('')
  }))
  .filter((c) => c.key.length > 0);

const lcs = (a, b) => {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    const ai = a[i - 1];
    for (let j = 1; j <= m; j++) {
      dp[i][j] = ai === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[n][m];
};

const bestMatch = (key) => {
  let best = null;
  for (const cand of candidates) {
    const l = lcs(key, cand.key);
    if (l === 0) continue;
    const recall = l / key.length;
    const precision = l / cand.key.length;
    const score = (recall + precision) / 2;
    if (recall < 0.6) continue;
    if (!best || score > best.score || (score === best.score && cand.key.length < best.cand.key.length)) {
      best = { cand, score };
    }
  }
  return best;
};

const isCorrupted = (s) => {
  if (!s) return false;
  if (s.includes('?')) return true;
  // Check for control characters by code point
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if ((code >= 0 && code <= 8) || (code >= 11 && code <= 12) || (code >= 14 && code <= 31)) {
      return true;
    }
  }
  return false;
};

const files = [
  'src/App.jsx',
  'src/components/AttendanceView.jsx',
  'src/components/ScheduleView.jsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const code = fs.readFileSync(file, 'utf8');
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  const reps = [];

  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const n of node) visit(n);
      return;
    }

    if (node.type === 'StringLiteral') {
      const val = node.value;
      if (isCorrupted(val)) {
        const key = (val.match(/[\u0600-\u06FF]/g) || []).join('');
        if (key.length >= 2) {
          const match = bestMatch(key);
          if (match) {
            const raw = node.extra?.raw || '""';
            const quote = raw[0] || '"';
            const escaped = match.cand.text
              .replace(/\\/g, '\\\\')
              .replace(new RegExp(quote, 'g'), `\\${quote}`);
            const newRaw = `${quote}${escaped}${quote}`;
            reps.push({ start: node.start, end: node.end, text: newRaw });
          }
        }
      }
    }

    if (node.type === 'JSXText') {
      const val = node.value;
      if (val && val.trim() && isCorrupted(val)) {
        const key = (val.match(/[\u0600-\u06FF]/g) || []).join('');
        if (key.length >= 2) {
          const match = bestMatch(key);
          if (match) {
            reps.push({ start: node.start, end: node.end, text: match.cand.text });
          }
        }
      }
    }

    if (node.type === 'TemplateElement') {
      const val = node.value?.cooked;
      if (val && isCorrupted(val)) {
        const key = (val.match(/[\u0600-\u06FF]/g) || []).join('');
        if (key.length >= 2) {
          const match = bestMatch(key);
          if (match) {
            const raw = match.cand.text.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
            reps.push({ start: node.start, end: node.end, text: raw });
          }
        }
      }
    }

    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'start' || key === 'end') continue;
      visit(node[key]);
    }
  };

  visit(ast);

  if (reps.length) {
    let out = code;
    reps.sort((a, b) => b.start - a.start);
    for (const r of reps) {
      out = out.slice(0, r.start) + r.text + out.slice(r.end);
    }
    fs.writeFileSync(file, out, 'utf8');
    console.log('replaced', reps.length, 'in', file);
  } else {
    console.log('no replacements for', file);
  }
}
