// SETUP: Map of year -> master data Sheet ID (from the share/edit URL).
// Add a new entry each year; older years remain in history automatically.
const YEAR_SHEETS = {
  '2025': '1yMog1g-Ad6huk_QpflsFIE2s6kboMSv6w-YlJqbb0BQ',
  '2026': '15y9gU2xsLRSujHeuNepWir5XmzaBTXgFOWkOTGtzi9Y'
};

const CLASS_SHEETS = [
  'TAHUN 1 GEMILANG', 'TAHUN 2 GEMILANG', 'TAHUN 3 GEMILANG',
  'TAHUN 4 GEMILANG', 'TAHUN 5 GEMILANG', 'TAHUN 5 CEMERLANG',
  'TAHUN 6 GEMILANG', 'TAHUN 6 CEMERLANG'
];

const CLASS_DISPLAY = {
  'TAHUN 1 GEMILANG': 'Tahun 1 Gemilang', 'TAHUN 2 GEMILANG': 'Tahun 2 Gemilang',
  'TAHUN 3 GEMILANG': 'Tahun 3 Gemilang', 'TAHUN 4 GEMILANG': 'Tahun 4 Gemilang',
  'TAHUN 5 GEMILANG': 'Tahun 5 Gemilang', 'TAHUN 5 CEMERLANG': 'Tahun 5 Cemerlang',
  'TAHUN 6 GEMILANG': 'Tahun 6 Gemilang', 'TAHUN 6 CEMERLANG': 'Tahun 6 Cemerlang'
};

// Raw subject codes as they appear in sheet headers.
// Subjects are detected dynamically from the header row; this list is only a
// fallback set for known codes (PMZ in sheets = MUZIK in the UI).
const KNOWN_SUBJECTS = ['BM','BI','MM','SAINS','SEJ','PAI','PM','PMZ','PSV','PJPK','AR','BKD','RBT'];
const SUBJECT_UI_MAP = { 'PMZ': 'MUZIK' };

// Server cache TTL in seconds (5 minutes). "Muat Semula" bypasses with nocache=1.
const CACHE_TTL = 300;

function doGet(e) {
  const action = e?.parameter?.action || 'stats';
  try {
    if (action === 'years') {
      const years = Object.keys(YEAR_SHEETS).sort();
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', data: years }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const year = resolveYear(e?.parameter?.year);
    let result = null;

    // Serve cached fullData when available (unless explicitly bypassed).
    if (action === 'fullData' && e?.parameter?.nocache !== '1') {
      result = cacheGet('pbd_' + year.value);
    }

    if (!result) {
      const ss = SpreadsheetApp.openById(year.sheetId);
      switch (action) {
        case 'classes': result = getClasses(ss); break;
        case 'students': result = getStudents(ss, e.parameter.class, e.parameter.period); break;
        case 'summary': result = getSummary(ss, e.parameter.subject); break;
        case 'fullData': default: result = getFullData(ss); break;
      }
      if (action === 'fullData') cachePut('pbd_' + year.value, result);
    }

    result.year = year.value;
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ---- Cache helpers (ScriptCache, 100KB/item — gzip when large) ----
function cacheGet(key) {
  const cache = CacheService.getScriptCache();
  const plain = cache.get(key);
  if (plain) {
    try { return JSON.parse(plain); } catch (e) { /* fall through */ }
  }
  const gz = cache.get(key + '_gz');
  if (gz) {
    try {
      const blob = Utilities.newBlob(Utilities.base64Decode(gz), 'application/octet-stream');
      return JSON.parse(Utilities.ungzip(blob).getDataAsString());
    } catch (e) { /* corrupted — ignore */ }
  }
  return null;
}

function cachePut(key, obj) {
  const json = JSON.stringify(obj);
  const cache = CacheService.getScriptCache();
  if (json.length <= 60000) {
    cache.put(key, json, CACHE_TTL);
    return;
  }
  const gz = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(json).getBytes()));
  if (gz.length <= 90000) cache.put(key + '_gz', gz, CACHE_TTL);
  // Too big for the script cache: skip server cache (frontend caches instead).
}

// Pick the sheet for the requested year; default to the latest available.
function resolveYear(y) {
  const years = Object.keys(YEAR_SHEETS).sort();
  const key = y && YEAR_SHEETS[y] ? String(y) : years[years.length - 1];
  return { value: key, sheetId: YEAR_SHEETS[key] };
}

// ---- Gender: prefer BIN/BINTI in name, fall back to sheet value ----
function fixGender(name, sheetVal) {
  const n = ' ' + name.toUpperCase() + ' ';
  if (/\bBINTI\b/.test(n)) return 'P';
  if (/\bBIN\b/.test(n)) return 'L';
  const s = String(sheetVal || '').trim().toUpperCase();
  return s === 'L' || s === 'P' ? s : '';
}

function uiName(sub) { return SUBJECT_UI_MAP[sub] || sub; }

// Cross-fill gender from the other period when a row lacks it in one section.
function fillGender(pt, ak) {
  const index = {};
  for (const s of ak) index[s.name] = s.gender;
  for (const s of pt) { if (!s.gender && index[s.name]) s.gender = index[s.name]; }
  const index2 = {};
  for (const s of pt) index2[s.name] = s.gender;
  for (const s of ak) { if (!s.gender && index2[s.name]) s.gender = index2[s.name]; }
}

// Read subject columns from a header row. Stops at the first blank header or
// the "ANALISIS" block, so subjects are always read from raw headers.
function readSubjects(headerRow) {
  const map = {};
  for (let c = 4; c < headerRow.length; c++) {
    const h = String(headerRow[c]).trim().toUpperCase();
    if (!h) break;
    if (h === 'ANALISIS' || h === 'ANALISIS:') break;
    map[h] = c;
  }
  return map;
}

// Parse every class sheet exactly ONCE per request.
// Returns { id: { pertengahan: [...], akhir: [...], headers: {pertengahan, akhir} } }
// Fully dynamic: sections are found from title rows ("PERTENGAHAN"/"AKHIR"),
// header rows by "Nama" in the name column, and subjects from the actual
// header row. If a sheet has no PERTENGAHAN title (e.g. Tahun 4), the first
// header defaults to pertengahan.
function parseAll(ss) {
  const out = {};
  for (const id of CLASS_SHEETS) {
    const sheet = ss.getSheetByName(id);
    if (!sheet) continue;
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 3) continue;
    const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();

    const sections = { pertengahan: [], akhir: [] };
    const headers = { pertengahan: null, akhir: null };
    let cur = 'pertengahan';

    for (let r = 0; r < data.length; r++) {
      const row = data[r];
      const au = String(row[0]).trim().toUpperCase();

      // Title row switches current section
      if (au.includes('PERTENGAHAN')) { cur = 'pertengahan'; continue; }
      if (au.includes('AKHIR') && !au.includes('PERTENGAHAN')) { cur = 'akhir'; continue; }

      // Header row: name column contains "Nama"
      if (String(row[1]).trim().toUpperCase() === 'NAMA') {
        headers[cur] = readSubjects(row);
        continue;
      }

      // Data row: numeric bil + name present
      if (headers[cur]) {
        const bil = parseFloat(String(row[0]).replace(/,/g, ''));
        const name = String(row[1]).trim();
        if (!isNaN(bil) && name.length >= 2) {
          const gender = fixGender(name, row[3]);
          const ic = String(row[2] || '').trim();
          const subjects = {};
          for (const [code, col] of Object.entries(headers[cur])) {
            const v = String(row[col]).trim().toUpperCase();
            if (v.startsWith('TP')) subjects[uiName(code)] = v;
          }
          sections[cur].push({ bil, name, ic, gender, subjects });
        }
      }
    }
    out[id] = { pertengahan: sections.pertengahan, akhir: sections.akhir, headers };
  }
  return out;
}

function getClasses(ss) {
  const parsed = parseAll(ss);
  const result = [];
  for (const id of CLASS_SHEETS) {
    const d = parsed[id];
    if (!d) continue;
    const pt = d.pertengahan, ak = d.akhir;
    const n = pt.length > 0 ? pt.length : ak.length;
    const set = new Set();
    for (const per of ['pertengahan', 'akhir']) {
      const hdr = d.headers[per];
      if (hdr) Object.keys(hdr).forEach(s => set.add(uiName(s)));
    }
    result.push({
      id, name: CLASS_DISPLAY[id] || id, students: n,
      year: (id.match(/\d+/)?.[0] || ''),
      subjects: Array.from(set)
    });
  }
  return result;
}

function getStudents(ss, className, period) {
  if (!className) return [];
  const parsed = parseAll(ss);
  const d = parsed[className];
  if (!d) return [];
  return d[period || 'pertengahan'] || [];
}

// Per-subject summary across all classes for both periods
function getSummary(ss, subject) {
  if (!subject) return null;
  const parsed = parseAll(ss);
  const result = { pertengahan: {}, akhir: {} };
  for (const cid of CLASS_SHEETS) {
    const d = parsed[cid];
    if (!d) continue;
    for (const per of ['pertengahan', 'akhir']) {
      const counts = { TP1: 0, TP2: 0, TP3: 0, TP4: 0, TP5: 0, TP6: 0 };
      let total = 0;
      for (const s of d[per]) {
        const tp = s.subjects[subject];
        if (tp && counts[tp] !== undefined) { counts[tp]++; total++; }
      }
      const tp36 = counts.TP3 + counts.TP4 + counts.TP5 + counts.TP6;
      result[per][cid] = {
        counts, total, tp3to6: tp36,
        tp3to6Pct: total > 0 ? Math.round(tp36 / total * 100) : 0
      };
    }
  }
  return result;
}

function getFullData(ss) {
  const parsed = parseAll(ss);
  const classes = [];
  const students = {};
  const classSubjects = {};
  const summaries = {};
  const subjectSet = new Set();

  for (const id of CLASS_SHEETS) {
    const d = parsed[id];
    if (!d) continue;
    const pt = d.pertengahan, ak = d.akhir;
    fillGender(pt, ak);
    students[id] = { pertengahan: pt, akhir: ak };
    const n = pt.length > 0 ? pt.length : ak.length;
    classes.push({ id, name: CLASS_DISPLAY[id] || id, students: n, year: (id.match(/\d+/)?.[0] || '') });

    // subjects per class per period (from the single parse)
    const cs = { pertengahan: [], akhir: [] };
    for (const per of ['pertengahan', 'akhir']) {
      const hdr = d.headers[per];
      const list = hdr ? Object.keys(hdr).map(uiName) : [];
      cs[per] = list;
      list.forEach(s => subjectSet.add(s));
    }
    classSubjects[id] = cs;
  }

  for (const sub of subjectSet) {
    const result = { pertengahan: {}, akhir: {} };
    for (const cid of CLASS_SHEETS) {
      const d = parsed[cid];
      if (!d) continue;
      for (const per of ['pertengahan', 'akhir']) {
        const counts = { TP1: 0, TP2: 0, TP3: 0, TP4: 0, TP5: 0, TP6: 0 };
        let total = 0;
        for (const s of d[per]) {
          const tp = s.subjects[sub];
          if (tp && counts[tp] !== undefined) { counts[tp]++; total++; }
        }
        const tp36 = counts.TP3 + counts.TP4 + counts.TP5 + counts.TP6;
        result[per][cid] = {
          counts, total, tp3to6: tp36,
          tp3to6Pct: total > 0 ? Math.round(tp36 / total * 100) : 0
        };
      }
    }
    summaries[sub] = result;
  }

  let totalStudents = 0;
  for (const c of classes) totalStudents += c.students;

  let overallPct = 0, subjectCount = 0;
  for (const sub of subjectSet) {
    const summary = summaries[sub];
    if (!summary) continue;
    let totalAll = 0, tp3all = 0;
    for (const [cid, d] of Object.entries(summary.akhir)) {
      if (d) { totalAll += d.total; tp3all += d.tp3to6; }
    }
    if (totalAll > 0) { overallPct += Math.round(tp3all / totalAll * 100); subjectCount++; }
  }

  const subjectList = Array.from(subjectSet).sort();
  return {
    generatedAt: new Date().toISOString(),
    stats: {
      totalStudents, totalClasses: classes.length, totalSubjects: subjectList.length,
      avgTp3to6Pct: subjectCount > 0 ? Math.round(overallPct / subjectCount) : 0
    },
    classes, subjectList, students, summaries, classSubjects
  };
}
