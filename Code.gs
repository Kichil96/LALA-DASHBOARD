// SETUP: Replace with your actual Sheet ID (from the edit URL)
const SHEET_ID = '1BSFRUCg9McSOlcdGCqWTbsn_1ePfM3duV2z6lSyfrOk';

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

// All possible subjects found in per-class sheets.
// Lower years: BM,BI,MM,SAINS,PAI,PM,PMZ,PSV,PJPK,AR,BKD
// Upper years: BM,BI,MM,SAINS,SEJ,PAI,PM,BKD,RBT,AR,PJPK,PMZ,PSV
const ALL_SUBJECTS = ['BM','BI','MM','SAINS','SEJ','PAI','PM','PMZ','PSV','PJPK','AR','BKD','RBT'];
// Summary subject names (PMZ in sheets = MUZIK in UI)
const SUBJECT_UI_MAP = { 'PMZ': 'MUZIK' };

function doGet(e) {
  const action = e?.parameter?.action || 'stats';
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let result;
    switch (action) {
      case 'classes': result = getClasses(ss); break;
      case 'subjects': result = getSubjectList(ss); break;
      case 'students': result = getStudents(ss, e.parameter.class, e.parameter.period); break;
      case 'summary': result = getSummary(ss, e.parameter.subject); break;
      case 'student': result = getStudentDetail(ss, e.parameter.name, e.parameter.className); break;
      case 'fullData': result = getFullData(ss); break;
      case 'stats': default: result = getStats(ss); break;
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function isUpper(cid) { return cid.startsWith('TAHUN 5') || cid.startsWith('TAHUN 6'); }
function getPerClassSubjects(cid) {
  if (isUpper(cid)) return ['BM','BI','MM','SAINS','SEJ','PAI','PM','BKD','RBT','AR','PJPK','PMZ','PSV'];
  return ['BM','BI','MM','SAINS','PAI','PM','PMZ','PSV','PJPK','AR','BKD'];
}

function getClasses(ss) {
  const result = [];
  for (const id of CLASS_SHEETS) {
    const sheet = ss.getSheetByName(id);
    if (!sheet) continue;
    const students = readStudentsFromSheet(sheet, 'pertengahan');
    let yr = id.match(/\d+/)?.[0] || '';
    result.push({ id, name: CLASS_DISPLAY[id] || id, students: students.length, year: yr });
  }
  return result;
}

function getSubjectList(ss) {
  const set = new Set();
  for (const id of CLASS_SHEETS) {
    const sheet = ss.getSheetByName(id);
    if (!sheet) continue;
    for (const subj of getPerClassSubjects(id)) {
      // Map PMZ to UI name
      set.add(SUBJECT_UI_MAP[subj] || subj);
    }
  }
  return Array.from(set).sort();
}

// Read student rows from a sheet for a given period
function readStudentsFromSheet(sheet, period) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 5) return [];
  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  // Find section starts
  let ptStart = -1, atStart = -1;
  for (let r = 0; r < data.length; r++) {
    const v = String(data[r][0]).trim().toUpperCase();
    if (v.includes('PERTENGAHAN')) ptStart = r;
    if (v.includes('AKHIR') && !v.includes('PERTENGAHAN')) atStart = r;
  }
  const sectionStart = period === 'akhir' ? atStart : ptStart;
  if (sectionStart < 0) return [];
  // Find header row (contains "Bil." and "Nama")
  let hdrRow = -1;
  for (let r = sectionStart + 1; r < Math.min(sectionStart + 5, data.length); r++) {
    const v = String(data[r][0]).trim().toUpperCase();
    if (v === 'BIL.' || v === 'BIL') { hdrRow = r; break; }
  }
  if (hdrRow < 0) return [];
  const headers = data[hdrRow];
  // Map column headers to subject codes
  const colMap = {};
  for (let c = 0; c < headers.length; c++) {
    const h = String(headers[c]).trim().toUpperCase();
    if (ALL_SUBJECTS.includes(h)) colMap[c] = h;
  }
  const students = [];
  const endRow = period === 'akhir' ? data.length : (atStart > 0 ? atStart - 1 : data.length);
  for (let r = hdrRow + 1; r < endRow; r++) {
    const bil = String(data[r][0]).trim();
    if (!bil || !/^\d+$/.test(bil)) continue;
    const name = String(data[r][1] || '').trim();
    if (!name || name.length < 2) continue;
    const gender = String(data[r][3] || '').trim();
    const student = { bil: Number(bil), name, gender, subjects: {} };
    for (const [colIdx, subjCode] of Object.entries(colMap)) {
      const val = String(data[r][parseInt(colIdx)] || '').trim().toUpperCase();
      if (val.startsWith('TP')) {
        // Map PMZ to MUZIK for UI
        const uiSubj = SUBJECT_UI_MAP[subjCode] || subjCode;
        student.subjects[uiSubj] = val;
      }
    }
    students.push(student);
  }
  return students;
}

function getStudents(ss, className, period) {
  if (!className) return [];
  const sheet = ss.getSheetByName(className);
  if (!sheet) return [];
  return readStudentsFromSheet(sheet, period || 'pertengahan');
}

function getStudentDetail(ss, name, className) {
  if (!className || !name) return null;
  const pt = readStudentsFromSheet(ss.getSheetByName(className), 'pertengahan').find(s => s.name === name);
  const ak = readStudentsFromSheet(ss.getSheetByName(className), 'akhir').find(s => s.name === name);
  if (!pt && !ak) return null;
  return { name, className, pertengahan: pt || null, akhir: ak || null };
}

// Compute summary for one subject from all class sheets
function getSummary(ss, subject) {
  if (!subject) return null;
  const result = { pertengahan: {}, akhir: {} };
  for (const cid of CLASS_SHEETS) {
    const sheet = ss.getSheetByName(cid);
    if (!sheet) continue;
    // Get raw student data for this class
    const ptStudents = readStudentsFromSheet(sheet, 'pertengahan');
    const akStudents = readStudentsFromSheet(sheet, 'akhir');
    const subs = getPerClassSubjects(cid);
    // Check if this class has this subject (consider UI mapping)
    const rawSubj = Object.keys(SUBJECT_UI_MAP).find(k => SUBJECT_UI_MAP[k] === subject) || subject;
    if (!subs.includes(rawSubj)) continue;
    // Compute TP counts for Pertengahan
    const ptCounts = { TP1: 0, TP2: 0, TP3: 0, TP4: 0, TP5: 0, TP6: 0 };
    let ptTotal = 0;
    for (const s of ptStudents) {
      const tp = s.subjects[subject];
      if (tp && ptCounts[tp] !== undefined) { ptCounts[tp]++; ptTotal++; }
    }
    const ptTp3 = ptCounts.TP3 + ptCounts.TP4 + ptCounts.TP5 + ptCounts.TP6;
    // Compute TP counts for Akhir
    const akCounts = { TP1: 0, TP2: 0, TP3: 0, TP4: 0, TP5: 0, TP6: 0 };
    let akTotal = 0;
    for (const s of akStudents) {
      const tp = s.subjects[subject];
      if (tp && akCounts[tp] !== undefined) { akCounts[tp]++; akTotal++; }
    }
    const akTp3 = akCounts.TP3 + akCounts.TP4 + akCounts.TP5 + akCounts.TP6;
    result.pertengahan[cid] = {
      counts: ptCounts, total: ptTotal,
      tp3to6: ptTp3, tp3to6Pct: ptTotal > 0 ? Math.round(ptTp3 / ptTotal * 100) : 0
    };
    result.akhir[cid] = {
      counts: akCounts, total: akTotal,
      tp3to6: akTp3, tp3to6Pct: akTotal > 0 ? Math.round(akTp3 / akTotal * 100) : 0
    };
  }
  return result;
}

function getFullData(ss) {
  const classes = getClasses(ss);
  const subjectList = getSubjectList(ss);
  const students = {};
  const summaries = {};
  for (const cid of CLASS_SHEETS) {
    const sheet = ss.getSheetByName(cid);
    if (!sheet) continue;
    students[cid] = {
      pertengahan: readStudentsFromSheet(sheet, 'pertengahan'),
      akhir: readStudentsFromSheet(sheet, 'akhir')
    };
  }
  for (const subj of subjectList) {
    summaries[subj] = getSummary(ss, subj);
  }
  let totalStudents = 0;
  for (const c of classes) totalStudents += c.students;
  let overallPct = 0, subjectCount = 0;
  for (const subj of subjectList) {
    const summary = summaries[subj];
    if (!summary) continue;
    let totalAll = 0, tp3all = 0;
    for (const [cid, d] of Object.entries(summary.akhir)) {
      if (d) { totalAll += d.total; tp3all += d.tp3to6; }
    }
    if (totalAll > 0) { overallPct += Math.round(tp3all / totalAll * 100); subjectCount++; }
  }
  return {
    stats: {
      totalStudents, totalClasses: classes.length, totalSubjects: subjectList.length,
      avgTp3to6Pct: subjectCount > 0 ? Math.round(overallPct / subjectCount) : 0
    },
    classes, subjectList, students, summaries
  };
}

function getStats(ss) {
  const classes = getClasses(ss);
  let totalStudents = 0;
  for (const c of classes) totalStudents += c.students;
  const subjectList = getSubjectList(ss);
  let overallPct = 0, subjectCount = 0;
  for (const subj of subjectList) {
    const summary = getSummary(ss, subj);
    if (!summary) continue;
    let totalAll = 0, tp3all = 0;
    for (const [cid, d] of Object.entries(summary.akhir)) {
      if (d) { totalAll += d.total; tp3all += d.tp3to6; }
    }
    if (totalAll > 0) { overallPct += Math.round(tp3all / totalAll * 100); subjectCount++; }
  }
  return {
    totalStudents, totalClasses: classes.length, totalSubjects: subjectList.length,
    avgTp3to6Pct: subjectCount > 0 ? Math.round(overallPct / subjectCount) : 0,
    classes, subjectList
  };
}
