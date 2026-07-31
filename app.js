const SUBJ_COLORS = {
  BM: '#6366f1', BI: '#ec4899', MM: '#10b981', SAINS: '#f59e0b',
  PAI: '#8b5cf6', PM: '#f97316', MUZIK: '#06b6d4', PSV: '#e11d48',
  PJPK: '#22c55e', AR: '#0ea5e9', BKD: '#d946ef', SEJ: '#14b8a6',
  RBT: '#a855f7'
};

const TP_COLORS = {
  TP1: '#ef4444', TP2: '#f97316', TP3: '#eab308', TP4: '#22c55e',
  TP5: '#06b6d4', TP6: '#6366f1'
};

const TP_LABELS = ['TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6'];

// Per-class sheet subjects (lower years map PMZ -> MUZIK)
const PER_CLASS_LOWER = ['BM', 'BI', 'MM', 'SAINS', 'PAI', 'PM', 'MUZIK', 'PSV', 'PJPK', 'AR', 'BKD'];
const PER_CLASS_UPPER = ['BM', 'BI', 'MM', 'SAINS', 'SEJ', 'PAI', 'PM', 'BKD', 'RBT', 'AR', 'PJPK', 'MUZIK', 'PSV'];

// Summary subjects (canonical list from summary sheets)
const SUMMARY_SUBJECTS = Object.keys(SUBJ_COLORS);

const CLASS_NAMES = [
  'Tahun 1 Gemilang', 'Tahun 2 Gemilang', 'Tahun 3 Gemilang', 'Tahun 4 Gemilang',
  'Tahun 5 Gemilang', 'Tahun 5 Cemerlang', 'Tahun 6 Gemilang', 'Tahun 6 Cemerlang'
];

const CLASS_IDS = [
  'TAHUN 1 GEMILANG', 'TAHUN 2 GEMILANG', 'TAHUN 3 GEMILANG', 'TAHUN 4 GEMILANG',
  'TAHUN 5 GEMILANG', 'TAHUN 5 CEMERLANG', 'TAHUN 6 GEMILANG', 'TAHUN 6 CEMERLANG'
];

function isUpper(c) {
  return c.startsWith('TAHUN 5') || c.startsWith('TAHUN 6');
}
function getSubjectsForClass(cid) { return isUpper(cid) ? PER_CLASS_UPPER : PER_CLASS_LOWER; }

let YEAR = '2025'; // resolved from API at startup

// Dynamic helpers — prefer live API data, fall back to static lists.
function getAllSubjects() {
  if (MOCK.subjectList && MOCK.subjectList.length) return MOCK.subjectList;
  return Object.keys(SUBJ_COLORS);
}
function getClassSubjects(cid, period) {
  const cs = MOCK.classSubjects?.[cid];
  if (cs) {
    if (period && cs[period]?.length) return cs[period];
    const union = [...new Set([...(cs.pertengahan || []), ...(cs.akhir || [])])];
    if (union.length) return union;
  }
  if (MOCK.subjects?.[cid]?.length) return MOCK.subjects[cid];
  return getSubjectsForClass(cid);
}
function subjColor(sub) { return SUBJ_COLORS[sub] || '#6366f1'; }
const API_BASE = 'https://script.google.com/macros/s/AKfycbxy-CNgFYhiNO2fusyUffErsJIBhb-4pFWNjagLUVJNZbMX954_jnQo3sDys-T_iV4/exec';

async function apiFetch(action, params = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set('action', action);
  if (action !== 'years') url.searchParams.set('year', YEAR);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url.toString());
    const json = await res.json();
    if (json.status === 'ok') return json.data;
    console.warn('API error for', action, json.message);
    return null;
  } catch (e) {
    console.warn('API fetch failed for', action, e);
    return null;
  }
}

// ====== MOCK DATA ======
const MOCK = {};

function buildMockData() {
  const firstNames = ['AARIZ FADZIL', 'NUR AFIA ALISHA', 'MUHAMMAD AQIL', 'NUR FARHA FALISHA', 'AHMAD AMIN AFKAR'];
  const lastNames = ['BIN MOHAMMAD', 'BINTI NASARUDIN', 'BIN ZAIDI', 'BINTI NORAZAMIN', 'BIN MOHAMMAD ANAPI'];
  const genders = ['L', 'P', 'L', 'P', 'L'];

  MOCK.classes = CLASS_NAMES.map((n, i) => ({
    id: CLASS_IDS[i], name: n, students: 20 + Math.floor(Math.random() * 20), year: String(i + 1)
  }));

  MOCK.subjects = {};
  for (const cid of CLASS_IDS) {
    MOCK.subjects[cid] = getSubjectsForClass(cid);
  }

  MOCK.students = {};
  MOCK.summary = {};

  const allSubjects = SUMMARY_SUBJECTS;

  for (const cid of CLASS_IDS) {
    MOCK.students[cid] = { pertengahan: [], akhir: [] };
    const subs = MOCK.subjects[cid];
    const count = 15 + Math.floor(Math.random() * 20);

    for (let i = 0; i < count; i++) {
      const name = firstNames[i % firstNames.length] + ' ' + (i < firstNames.length ? lastNames[i % lastNames.length] : 'BIN ABDULLAH ' + (i + 1));
      const gender = genders[i % genders.length];
      const sP = { bil: i + 1, name, gender, subjects: {} };
      const sA = { bil: i + 1, name, gender, subjects: {} };
      for (const sub of subs) {
        sP.subjects[sub] = 'TP' + (1 + Math.floor(Math.random() * 5));
        sA.subjects[sub] = 'TP' + (1 + Math.floor(Math.random() * 5));
      }
      MOCK.students[cid].pertengahan.push(sP);
      MOCK.students[cid].akhir.push(sA);
    }
  }

  for (const sub of allSubjects) {
    MOCK.summary[sub] = { pertengahan: {}, akhir: {} };
    for (const cid of CLASS_IDS) {
      const subs = MOCK.subjects[cid];
      if (!subs.includes(sub)) continue;
      for (const per of ['pertengahan', 'akhir']) {
        const students = MOCK.students[cid][per];
        const counts = { TP1: 0, TP2: 0, TP3: 0, TP4: 0, TP5: 0, TP6: 0 };
        let total = 0;
        for (const s of students) {
          const tp = s.subjects[sub];
          if (tp && counts[tp] !== undefined) { counts[tp]++; total++; }
        }
        const tp3to6 = counts.TP3 + counts.TP4 + counts.TP5 + counts.TP6;
        MOCK.summary[sub][per][cid] = { counts, total, tp3to6, tp3to6Pct: total > 0 ? Math.round(tp3to6 / total * 100) : 0 };
      }
    }
  }
}
buildMockData();

async function loadLiveData() {
  // Resolve available years and current year from the backend
  const years = await apiFetch('years');
  if (years && years.length) {
    S.years = years;
    if (!years.includes(S.year)) S.year = years[years.length - 1];
    YEAR = S.year;
    renderYearSelector();
  }
  // Try single fullData call (optimized path)
  const data = await apiFetch('fullData');
  if (data && data.students && data.summaries) {
    MOCK.classes = data.classes || MOCK.classes;
    MOCK.students = data.students;
    MOCK.summary = data.summaries;
    MOCK.subjectList = data.subjectList;
    MOCK.classSubjects = data.classSubjects;
    return true;
  }
  // Fallback: fetch individual pieces
  const stats = await apiFetch('stats');
  if (!stats) return false;
  MOCK.classes = stats.classes || MOCK.classes;
  MOCK.students = {};
  MOCK.summary = {};
  for (const cid of CLASS_IDS) {
    MOCK.students[cid] = { pertengahan: [], akhir: [] };
    const pt = await apiFetch('students', { class: cid, period: 'pertengahan' });
    const ak = await apiFetch('students', { class: cid, period: 'akhir' });
    if (pt) MOCK.students[cid].pertengahan = pt;
    if (ak) MOCK.students[cid].akhir = ak;
  }
  for (const sub of getAllSubjects()) {
    const summary = await apiFetch('summary', { subject: sub });
    if (summary) MOCK.summary[sub] = summary;
  }
  return true;
}

(async () => {
  const live = await loadLiveData();
  if (live) {
    document.getElementById('status-badge').textContent = 'LIVE';
    document.getElementById('status-badge').style.background = '#22c55e';
  }
  MOCK.loaded = true;
  renderPage(S.page);
})();

// ====== APP STATE ======
const S = {
  page: 'rumusan',
  period: 'akhir',
  year: YEAR,
  years: [YEAR],
  subject: null,
  kelas: null,
  studentSearch: '',
  dataSource: 'mock',
  apiUrl: ''
};

// ====== NAVIGATION ======
function navigate(page) {
  S.page = page;
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  const target = document.querySelector(`.sidebar-item[data-page="${page}"]`);
  if (target) target.classList.add('active');
  document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderPage(page);
}

function setPeriod(p) {
  S.period = p;
  document.querySelectorAll('.period-btn').forEach(b => b.classList.toggle('active', b.dataset.period === p));
  renderPage(S.page);
}

function renderPage(page) {
  if (page === 'rumusan') renderRumusan();
  else if (page === 'subjek') renderSubjek();
  else if (page === 'kelas') renderKelas();
  else if (page === 'laporan') renderLaporan();
}

// ====== RUMUSAN PBD ======
let rumusanCharts = [];

function renderRumusan() {
  const container = document.getElementById('rumusan-content');
  container.innerHTML = '<div class="loading"><div class="spin"></div><div>Memuat data...</div></div>';

  setTimeout(() => {
    const allSubjects = getAllSubjects();
    const classes = MOCK.classes;
    let totalStudents = 0, tp3Total = 0, grandTotal = 0;
    for (const c of classes) {
      const cid = c.id;
      const students = MOCK.students[cid]?.[S.period] || [];
      totalStudents += students.length;
      const subs = getClassSubjects(cid, S.period);
      for (const s of students) {
        for (const sub of subs) {
          const tp = s.subjects[sub];
          if (tp) {
            grandTotal++;
            if (['TP3','TP4','TP5','TP6'].includes(tp)) tp3Total++;
          }
        }
      }
    }
    const overallPct = grandTotal > 0 ? Math.round(tp3Total / grandTotal * 100) : 0;

    let html = `
      <div class="school-header">
        <img src="logo-sk-sg-damit.png" alt="SK Sungai Damit" onerror="this.style.display='none'">
        <div>
          <h1>SEKOLAH KEBANGSAAN SUNGAI DAMIT</h1>
          <div class="sub">TUARAN, SABAH &nbsp;·&nbsp; Analisis PBD ${YEAR} &nbsp;·&nbsp; ${S.period === 'akhir' ? 'AKHIR TAHUN' : 'PERTENGAHAN TAHUN'}</div>
        </div>
      </div>
      <div class="kpi-row">
        <div class="kpi blue">
          <div class="kpi-icon">🎓</div>
          <div class="kpi-lbl">Jumlah Murid</div>
          <div class="kpi-val">${totalStudents}</div>
          <div class="kpi-meta">${classes.length} kelas</div>
        </div>
        <div class="kpi green">
          <div class="kpi-icon">📚</div>
          <div class="kpi-lbl">Mata Pelajaran</div>
          <div class="kpi-val">${allSubjects.length}</div>
          <div class="kpi-meta">${S.period === 'akhir' ? 'Akhir' : 'Pertengahan'} Tahun</div>
        </div>
        <div class="kpi amber">
          <div class="kpi-icon">📈</div>
          <div class="kpi-lbl">TP3 - TP6</div>
          <div class="kpi-val">${overallPct}%</div>
          <div class="kpi-meta">${tp3Total}/${grandTotal} pencapaian</div>
        </div>
        <div class="kpi purple">
          <div class="kpi-icon">🏫</div>
          <div class="kpi-lbl">Tahun</div>
          <div class="kpi-val">${YEAR}</div>
          <div class="kpi-meta">${S.period === 'akhir' ? 'Akhir' : 'Pertengahan'} Sesi Akademik</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:20px;flex-wrap:wrap">
        <div class="card-t" style="margin:0">Ringkasan Subjek</div>
        <select class="sel" id="rumusan-subj-filter" onchange="filterRumusanSubject()" style="min-width:140px">
          <option value="">Semua Subjek</option>
          ${allSubjects.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
      </div>
      <div class="charts-row">
        <div class="card">
          <div class="card-t">TP3-6% mengikut Kelas</div>
          <div class="card-s">Peratusan pencapaian setiap kelas (semua subjek)</div>
          <div class="cw" style="height:260px"><canvas id="rumusan-bar-chart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-t">Taburan Keseluruhan</div>
          <div class="card-s">Agihan TP semua subjek & kelas</div>
          <div class="donut-area">
            <div class="donut-box"><canvas id="rumusan-donut-chart"></canvas></div>
            <div class="legend" id="rumusan-donut-legend"></div>
          </div>
        </div>
      </div>
      <div class="subj-grid" id="rumusan-subj-cards"></div>
    `;
    container.innerHTML = html;

    renderRumusanCards();
    renderRumusanCharts(allSubjects);
  }, 50);
}

function renderRumusanCharts(filterSubject) {
  rumusanCharts.forEach(c => c.destroy());
  rumusanCharts = [];
  const period = S.period;
  const classes = MOCK.classes;
  const allSubjects = getAllSubjects();

  // Bar chart
  const barCtx = document.getElementById('rumusan-bar-chart');
  if (barCtx) {
    const labels = classes.map(c => c.name.replace('Tahun ', 'T').replace(' Gemilang', ' G').replace(' Cemerlang', ' C'));
    const data = classes.map(c => {
      let total = 0, tp3 = 0;
      const subs = getClassSubjects(c.id, S.period);
      for (const sub of subs) {
        const d = MOCK.summary[sub]?.[period]?.[c.id];
        if (d) { total += d.total; tp3 += d.tp3to6; }
      }
      return total > 0 ? Math.round(tp3 / total * 100) : 0;
    });
    rumusanCharts.push(new Chart(barCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'TP3-6%',
          data,
          backgroundColor: classes.map((_, i) => {
            const colors = ['#6366f1','#ec4899','#10b981','#f59e0b','#8b5cf6','#06b6d4','#f97316','#14b8a6'];
            return colors[i % colors.length];
          }),
          borderRadius: 6,
          maxBarThickness: 40
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%', font: { size: 11 } }, grid: { color: '#f1f3f7' } },
          x: { ticks: { font: { size: 10, weight: '700' } }, grid: { display: false } }
        }
      }
    }));
  }

  // Donut chart
  const donutCtx = document.getElementById('rumusan-donut-chart');
  if (donutCtx) {
    const tpCounts = { TP1: 0, TP2: 0, TP3: 0, TP4: 0, TP5: 0, TP6: 0 };
    for (const sub of allSubjects) {
      for (const c of classes) {
        const d = MOCK.summary[sub]?.[period]?.[c.id];
        if (d) {
          for (const tp of TP_LABELS) tpCounts[tp] += d.counts[tp] || 0;
        }
      }
    }
    const total = Object.values(tpCounts).reduce((a, b) => a + b, 0);
    rumusanCharts.push(new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: TP_LABELS,
        datasets: [{
          data: TP_LABELS.map(tp => tpCounts[tp]),
          backgroundColor: TP_LABELS.map(tp => TP_COLORS[tp]),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const val = ctx.parsed;
                const pct = total > 0 ? Math.round(val / total * 100) : 0;
                return `${ctx.label}: ${val} (${pct}%)`;
              }
            }
          }
        }
      }
    }));

    const legend = document.getElementById('rumusan-donut-legend');
    if (legend) {
      legend.innerHTML = TP_LABELS.map(tp => `
        <div class="li">
          <span class="ldot" style="background:${TP_COLORS[tp]}"></span>
          <span class="ll">${tp}</span>
          <span class="lv">${tpCounts[tp]}</span>
          <span class="lp">${total > 0 ? Math.round(tpCounts[tp] / total * 100) : 0}%</span>
        </div>
      `).join('');
    }
  }
}

function renderRumusanCards(filterSubject) {
  const container = document.getElementById('rumusan-subj-cards');
  if (!container) return;
  const allSubjects = getAllSubjects();
  const subjects = filterSubject ? [filterSubject] : allSubjects;
  const period = S.period;

  let html = '';
  for (const sub of subjects) {
    const color = subjColor(sub);
    const classes = MOCK.classes;
    let totalAll = 0, tp3All = 0;
    for (const c of classes) {
      const d = MOCK.summary[sub]?.[period]?.[c.id];
      if (d) { totalAll += d.total; tp3All += d.tp3to6; }
    }
    const pct = totalAll > 0 ? Math.round(tp3All / totalAll * 100) : 0;
    const top3 = [...classes]
      .map(c => ({ name: c.name, pct: MOCK.summary[sub]?.[period]?.[c.id]?.tp3to6Pct || 0 }))
      .sort((a, b) => b.pct - a.pct).slice(0, 3);

    html += `
      <div class="subj-card" onclick="selectSubject('${sub}')">
        <div class="subj-card-top">
          <div class="subj-card-name" style="color:${color}">${sub}</div>
          <div class="subj-card-pct" style="color:${color}">${pct}%</div>
        </div>
        <div class="subj-card-label">TP3-6%</div>
        <div class="subj-card-bar">
          <div class="subj-card-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <div class="subj-card-stats">
          <span class="subj-stat">${totalAll} murid</span>
          ${top3.map(c => `<span class="subj-stat">${c.name.replace('Tahun ', 'T').replace(' Gemilang', '').replace(' Cemerlang', '')} ${c.pct}%</span>`).join('')}
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

function filterRumusanSubject() {
  const val = document.getElementById('rumusan-subj-filter')?.value || '';
  renderRumusanCards(val || null);
  renderRumusanCharts(val || null);
}

function selectSubject(sub) {
  S.subject = sub;
  navigate('subjek');
  document.getElementById('subjek-select') && (document.getElementById('subjek-select').value = sub);
}

// ====== BY SUBJEK ======
let subjekCharts = [];

function renderSubjek() {
  const container = document.getElementById('subjek-content');
  const allSubjects = getAllSubjects();
  const currentSub = S.subject || allSubjects[0];

  let html = `
    <div class="page-header">
      <div class="page-row">
        <div>
          <div class="page-title">📚 <span class="accent">Prestasi Subjek</span></div>
          <div class="page-sub">${S.period === 'akhir' ? 'Akhir' : 'Pertengahan'} Tahun ${YEAR} — Bandingan merentas kelas</div>
        </div>
        <div class="page-controls">
          <select class="sel" id="subjek-select" onchange="changeSubject(this.value)">
            ${allSubjects.map(s => `<option value="${s}" ${s === currentSub ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    <div class="charts-row">
      <div class="card">
        <div class="card-t">
          <span style="color:${subjColor(currentSub)}">${currentSub}</span>
          <span class="card-badge">TP3-6% mengikut Kelas</span>
        </div>
        <div class="card-s">Peratusan murid mencapai TP3 hingga TP6 bagi setiap kelas</div>
        <div class="cw" style="height:300px"><canvas id="subjek-bar"></canvas></div>
      </div>
      <div class="card">
        <div class="card-t">Taburan TP</div>
        <div class="card-s">${currentSub} — semua kelas digabung</div>
        <div class="donut-area">
          <div class="donut-box"><canvas id="subjek-donut"></canvas></div>
          <div class="legend" id="subjek-donut-legend"></div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-t">Perbandingan Kelas</div>
      <div class="card-s">Data terperinci ${currentSub} setiap kelas</div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Kelas</th><th>Jumlah</th><th>TP1</th><th>TP2</th><th>TP3</th><th>TP4</th><th>TP5</th><th>TP6</th><th>TP3-6%</th></tr></thead>
          <tbody id="subjek-table-body"></tbody>
        </table>
      </div>
    </div>
  `;
  container.innerHTML = html;
  renderSubjekCharts(currentSub);
}

function changeSubject(sub) {
  S.subject = sub;
  renderSubjek();
}

function renderSubjekCharts(sub) {
  subjekCharts.forEach(c => c.destroy());
  subjekCharts = [];
  const period = S.period;
  const classes = MOCK.classes;

  const classData = classes
    .map(c => ({ name: c.name, d: MOCK.summary[sub]?.[period]?.[c.id] }))
    .filter(x => x.d && x.d.total > 0);

  const labels = classData.map(c => c.name.replace('Tahun ', 'T').replace(' Gemilang', ' G').replace(' Cemerlang', ' C'));
  const pcts = classData.map(c => c.d.tp3to6Pct);

  // Bar chart
  const barCtx = document.getElementById('subjek-bar');
  if (barCtx) {
    subjekCharts.push(new Chart(barCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'TP3-6%',
          data: pcts,
          backgroundColor: SUBJ_COLORS[sub] || '#6366f1',
          borderRadius: 6,
          maxBarThickness: 50
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%', font: { size: 11 } }, grid: { color: '#f1f3f7' } },
          x: { ticks: { font: { size: 10, weight: '700' } }, grid: { display: false } }
        }
      }
    }));
  }

  // Donut
  const donutCtx = document.getElementById('subjek-donut');
  if (donutCtx) {
    const counts = { TP1: 0, TP2: 0, TP3: 0, TP4: 0, TP5: 0, TP6: 0 };
    for (const c of classData) {
      for (const tp of TP_LABELS) counts[tp] += c.d.counts[tp] || 0;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    subjekCharts.push(new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: TP_LABELS,
        datasets: [{
          data: TP_LABELS.map(tp => counts[tp]),
          backgroundColor: TP_LABELS.map(tp => TP_COLORS[tp]),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const val = ctx.parsed;
                const pct = total > 0 ? Math.round(val / total * 100) : 0;
                return `${ctx.label}: ${val} (${pct}%)`;
              }
            }
          }
        }
      }
    }));

    const legend = document.getElementById('subjek-donut-legend');
    if (legend) {
      legend.innerHTML = TP_LABELS.map(tp => {
        const val = counts[tp];
        const pct = total > 0 ? Math.round(val / total * 100) : 0;
        return `<div class="li"><span class="ldot" style="background:${TP_COLORS[tp]}"></span><span class="ll">${tp}</span><span class="lv">${val}</span><span class="lp">${pct}%</span></div>`;
      }).join('');
    }
  }

  // Table
  const tbody = document.getElementById('subjek-table-body');
  if (tbody) {
    tbody.innerHTML = classData.map(c => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.d.total}</td>
        <td><span class="tp-badge tp-1">${c.d.counts.TP1}</span></td>
        <td><span class="tp-badge tp-2">${c.d.counts.TP2}</span></td>
        <td><span class="tp-badge tp-3">${c.d.counts.TP3}</span></td>
        <td><span class="tp-badge tp-4">${c.d.counts.TP4}</span></td>
        <td><span class="tp-badge tp-5">${c.d.counts.TP5}</span></td>
        <td><span class="tp-badge tp-6">${c.d.counts.TP6}</span></td>
        <td><strong style="color:${subjColor(sub)}">${c.d.tp3to6Pct}%</strong></td>
      </tr>
    `).join('');
  }
}

// ====== BY KELAS ======
function renderKelas() {
  const container = document.getElementById('kelas-content');
  const classes = MOCK.classes;
  const currentKelas = S.kelas || classes[0]?.id || '';

  let html = `
    <div class="page-header">
      <div class="page-row">
        <div>
          <div class="page-title">🏫 <span class="accent">Prestasi Kelas</span></div>
          <div class="page-sub">${S.period === 'akhir' ? 'Akhir' : 'Pertengahan'} Tahun ${YEAR} — Lihat murid dan TP</div>
        </div>
        <div class="page-controls">
          <select class="sel" id="kelas-select" onchange="changeKelas(this.value)">
            ${classes.map(c => `<option value="${c.id}" ${c.id === currentKelas ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    <div class="kpi-row" id="kelas-kpi"></div>
    <div class="card" style="margin-bottom:24px">
      <div class="card-t">Senarai Murid</div>
      <div class="card-s">Klik nama murid untuk lihat perincian</div>
      <div style="margin-bottom:12px">
        <input class="sel" style="min-width:200px;padding:8px 14px" type="text" placeholder="Cari murid..." id="kelas-search" oninput="S.studentSearch=this.value;renderKelasTable()">
      </div>
      <div class="tbl-wrap" id="kelas-table-wrap"></div>
    </div>
  `;
  container.innerHTML = html;
  renderKelasKPI(currentKelas);
  renderKelasTable(currentKelas);
}

function changeKelas(cid) {
  S.kelas = cid;
  renderKelasKPI(cid);
  renderKelasTable(cid);
}

function renderKelasKPI(cid) {
  const container = document.getElementById('kelas-kpi');
  if (!container) return;
  const students = MOCK.students[cid]?.[S.period] || [];
  const subs = getClassSubjects(cid, S.period);
  let totalTP = 0, tp3count = 0;
  for (const s of students) {
    for (const sub of subs) {
      const tp = s.subjects[sub];
      if (tp) { totalTP++; if (['TP3','TP4','TP5','TP6'].includes(tp)) tp3count++; }
    }
  }
  const pct = totalTP > 0 ? Math.round(tp3count / totalTP * 100) : 0;

  const classInfo = MOCK.classes.find(c => c.id === cid);
  container.innerHTML = `
    <div class="kpi blue"><div class="kpi-icon">👨‍🎓</div><div class="kpi-lbl">Jumlah Murid</div><div class="kpi-val">${students.length}</div><div class="kpi-meta">${classInfo?.name || cid}</div></div>
    <div class="kpi green"><div class="kpi-icon">📖</div><div class="kpi-lbl">Subjek</div><div class="kpi-val">${subs.length}</div><div class="kpi-meta">${subs.join(', ')}</div></div>
    <div class="kpi amber"><div class="kpi-icon">📊</div><div class="kpi-lbl">TP3-6%</div><div class="kpi-val">${pct}%</div><div class="kpi-meta">${tp3count}/${totalTP}</div></div>
    <div class="kpi purple"><div class="kpi-icon">📅</div><div class="kpi-lbl">Tempoh</div><div class="kpi-val">${S.period === 'akhir' ? 'Akhir' : 'Pertengahan'}</div><div class="kpi-meta">Tahun ${YEAR}</div></div>
  `;
}

function renderKelasTable(cid) {
  cid = cid || S.kelas || MOCK.classes[0]?.id;
  const students = MOCK.students[cid]?.[S.period] || [];
  const subs = getClassSubjects(cid, S.period);
  const search = S.studentSearch.toLowerCase();
  const filtered = search ? students.filter(s => s.name.toLowerCase().includes(search)) : students;

  const container = document.getElementById('kelas-table-wrap');
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">🔍</div><div>Tiada murid ditemui</div></div>';
    return;
  }

  let html = `<table><thead><tr><th>Bil.</th><th>Nama</th><th>J</th>${subs.map(s => `<th>${s}</th>`).join('')}</tr></thead><tbody>`;
  for (const s of filtered) {
    html += `<tr><td>${s.bil}</td><td><span class="student-link" onclick="showStudentDetail('${cid}','${s.name.replace(/'/g, "\\'")}')">${s.name}</span></td><td>${s.gender}</td>`;
    for (const sub of subs) {
      const tp = s.subjects[sub] || '';
      const cls = tp ? 'tp-badge tp-' + tp.replace('TP', '').toLowerCase() : '';
      html += `<td>${tp ? `<span class="${cls}">${tp}</span>` : '-'}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}

// ====== STUDENT DETAIL ======
function showStudentDetail(cid, name) {
  const pStudents = MOCK.students[cid]?.pertengahan || [];
  const aStudents = MOCK.students[cid]?.akhir || [];
  const pS = pStudents.find(s => s.name === name);
  const aS = aStudents.find(s => s.name === name);
  const subs = getClassSubjects(cid);

  const modal = document.getElementById('studentModal');
  document.getElementById('studentModalTitle').textContent = name;

  let bodyHtml = `
    <div class="detail-grid">
      <div class="detail-card t">
        <div class="detail-lbl">Kelas</div>
        <div class="detail-val">${MOCK.classes.find(c => c.id === cid)?.name || cid}</div>
        <div class="detail-sub">${S.period === 'akhir' ? 'Akhir' : 'Pertengahan'} Tahun ${YEAR}</div>
      </div>
    </div>
  `;

  if (subs.length > 0) {
    bodyHtml += `<table class="comp-table"><thead><tr><th>Subjek</th><th>Pertengahan</th><th>Akhir</th></tr></thead><tbody>`;
    for (const sub of subs) {
      const tpP = pS?.subjects[sub] || '-';
      const tpA = aS?.subjects[sub] || '-';
      const clsP = tpP.startsWith('TP') ? 'tp-badge tp-' + tpP.replace('TP','').toLowerCase() : '';
      const clsA = tpA.startsWith('TP') ? 'tp-badge tp-' + tpA.replace('TP','').toLowerCase() : '';
      bodyHtml += `<tr>
        <td><strong>${sub}</strong></td>
        <td>${tpP !== '-' ? `<span class="${clsP}">${tpP}</span>` : '-'}</td>
        <td>${tpA !== '-' ? `<span class="${clsA}">${tpA}</span>` : '-'}</td>
      </tr>`;
    }
    bodyHtml += `</tbody></table>`;
  }

  document.getElementById('studentModalBody').innerHTML = bodyHtml;
  modal.classList.add('open');
}

function closeStudentModal() {
  document.getElementById('studentModal').classList.remove('open');
}

// ====== LAPORAN ======
function renderLaporan() {
  const container = document.getElementById('laporan-content');
  const classes = MOCK.classes;
  const allSubjects = getAllSubjects();

  let html = `
    <div class="page-header">
      <div class="page-row">
        <div>
          <div class="page-title">🖨️ <span class="accent">Laporan</span></div>
          <div class="page-sub">Hasilkan laporan prestasi untuk cetakan</div>
        </div>
      </div>
    </div>
    <div class="card" style="max-width:600px;margin:0 auto">
      <div class="report-setup">
        <div class="sec">Pilih Kelas</div>
        <div class="check-grid" id="laporan-kelas-checks">
          ${classes.map(c => `<label class="check-lbl"><input type="checkbox" class="laporan-kelas-cb" value="${c.id}" checked> ${c.name}</label>`).join('')}
        </div>
        <div class="sec">Tempoh</div>
        <select class="sel" id="laporan-period" style="width:100%;margin-bottom:8px">
          <option value="akhir">Akhir Tahun</option>
          <option value="pertengahan">Pertengahan Tahun</option>
        </select>
        <div class="sec">Subjek</div>
        <select class="sel" id="laporan-subjek" style="width:100%;margin-bottom:8px">
          <option value="">Semua Subjek</option>
          ${allSubjects.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
        <div style="display:flex;gap:10px;margin-top:24px">
          <button class="rv-btn rv-btn-primary" onclick="generateReport()" style="flex:1">📄 Jana Laporan</button>
        </div>
      </div>
    </div>
  `;
  container.innerHTML = html;
}

function generateReport() {
  const selectedClasses = [...document.querySelectorAll('.laporan-kelas-cb:checked')].map(cb => cb.value);
  const period = document.getElementById('laporan-period')?.value || 'akhir';
  const subjekFilter = document.getElementById('laporan-subjek')?.value || '';

  if (selectedClasses.length === 0) { alert('Sila pilih sekurang-kurangnya satu kelas.'); return; }

  const overlay = document.getElementById('reportOverlay');
  overlay.classList.add('open');

  const periodLabel = period === 'akhir' ? 'AKHIR TAHUN' : 'PERTENGAHAN TAHUN';
  document.getElementById('rvSubtitle').textContent = `${periodLabel} ${YEAR} — SK Sungai Damit`;
  document.getElementById('rvDate').textContent = new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });

  // Compute per-subject stats across selected classes
  const allSubjects = getAllSubjects();
  const subjectStats = {};
  let grandTotalStudents = 0;

  for (const sub of allSubjects) {
    const counts = { TP1: 0, TP2: 0, TP3: 0, TP4: 0, TP5: 0, TP6: 0 };
    let total = 0;
    const studentSet = new Set();
    for (const cid of selectedClasses) {
      const students = MOCK.students[cid]?.[period] || [];
      const subs = getClassSubjects(cid, period);
      if (!subs.includes(sub)) continue;
      for (const s of students) {
        studentSet.add(s.name);
        const tp = s.subjects[sub];
        if (tp && counts[tp] !== undefined) { counts[tp]++; total++; }
      }
    }
    const tp12 = counts.TP1 + counts.TP2;
    const tp36 = counts.TP3 + counts.TP4 + counts.TP5 + counts.TP6;
    subjectStats[sub] = {
      counts,
      total,
      bilMurid: studentSet.size,
      tp12, tp12Pct: total > 0 ? Math.round(tp12 / total * 100) : 0,
      tp36, tp36Pct: total > 0 ? Math.round(tp36 / total * 100) : 0
    };
    grandTotalStudents += studentSet.size;
  }

  const filteredSubjects = subjekFilter ? allSubjects.filter(s => s === subjekFilter) : allSubjects;

  // Aggregate totals for KPI
  let aggTp36 = 0, aggTotal = 0, aggTp12 = 0;
  for (const sub of filteredSubjects) {
    const s = subjectStats[sub];
    if (s) { aggTp36 += s.tp36; aggTp12 += s.tp12; aggTotal += s.total; }
  }
  const overallPct = aggTotal > 0 ? Math.round(aggTp36 / aggTotal * 100) : 0;

  document.getElementById('rvTotFac').textContent = selectedClasses.length + ' kelas';
  document.getElementById('rvAudited').textContent = aggTotal + ' jumlah TP';
  document.getElementById('rvComp').textContent = overallPct + '%';
  document.getElementById('rvPend').textContent = aggTp12;

  // Reset charts
  const rvDonut = document.getElementById('rvDonut');
  const rvBar = document.getElementById('rvBar');
  if (rvDonut) { Chart.getChart(rvDonut)?.destroy(); }
  if (rvBar) { Chart.getChart(rvBar)?.destroy(); }

  setTimeout(() => {
    if (rvDonut) {
      new Chart(rvDonut, {
        type: 'doughnut',
        data: {
          labels: ['TP3-6', 'TP1-2'],
          datasets: [{
            data: [aggTp36, aggTp12],
            backgroundColor: ['#10b981', '#ef4444'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          cutout: '65%',
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  }, 100);

  // Subject comparison bar chart
  const barData = filteredSubjects.map(sub => {
    const s = subjectStats[sub];
    return { sub, pct: s ? s.tp36Pct : 0, tp36: s ? s.tp36 : 0, total: s ? s.total : 0 };
  }).filter(d => d.total > 0);

  setTimeout(() => {
    if (rvBar) {
      new Chart(rvBar, {
        type: 'bar',
        data: {
          labels: barData.map(d => d.sub),
          datasets: [{
            label: 'TP3-6%',
            data: barData.map(d => d.pct),
            backgroundColor: barData.map(d => SUBJ_COLORS[d.sub] || '#3b82f6'),
            borderRadius: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } }
          }
        }
      });
    }
  }, 100);

  // Report table — per subject with full TP breakdown
  const tpKeys = ['TP1','TP2','TP3','TP4','TP5','TP6'];
  document.getElementById('rvTableBody').innerHTML = filteredSubjects.map(sub => {
    const s = subjectStats[sub];
    if (!s || s.total === 0) return '';
    return `<tr>
      <td><strong>${sub}</strong></td>
      <td>${s.total}</td>
      ${tpKeys.map(tp => `
        <td>${s.counts[tp]}</td>
        <td>${Math.round(s.counts[tp] / s.total * 100)}%</td>
      `).join('')}
      <td><strong>${s.tp12}</strong></td>
      <td><strong>${s.tp12Pct}%</strong></td>
      <td><strong>${s.tp36}</strong></td>
      <td><strong>${s.tp36Pct}%</strong></td>
    </tr>`;
  }).join('');

  // Totals row
  const totalCounts = { TP1: 0, TP2: 0, TP3: 0, TP4: 0, TP5: 0, TP6: 0 };
  for (const sub of filteredSubjects) {
    const s = subjectStats[sub];
    if (s) for (const tp of tpKeys) totalCounts[tp] += s.counts[tp];
  }
  const tot12 = totalCounts.TP1 + totalCounts.TP2;
  const tot36 = totalCounts.TP3 + totalCounts.TP4 + totalCounts.TP5 + totalCounts.TP6;
  const totAll = tot12 + tot36;
  document.getElementById('rvTableBody').innerHTML += `<tr style="font-weight:800;background:#f1f5f9">
    <td>JUMLAH</td>
    <td>${totAll}</td>
    ${tpKeys.map(tp => `
      <td>${totalCounts[tp]}</td>
      <td>${totAll > 0 ? Math.round(totalCounts[tp] / totAll * 100) : 0}%</td>
    `).join('')}
    <td>${tot12}</td>
    <td>${totAll > 0 ? Math.round(tot12 / totAll * 100) : 0}%</td>
    <td>${tot36}</td>
    <td>${totAll > 0 ? Math.round(tot36 / totAll * 100) : 0}%</td>
  </tr>`;
}

function closeReport() {
  document.getElementById('reportOverlay').classList.remove('open');
}

// ====== EJEN PBD (Offline QA) ======
const SUGGESTIONS = [
  'Jumlah murid keseluruhan',
  'Senarai kelas',
  'Peratus TP3-6 tertinggi',
  'Subjek paling ramai TP1',
  'Purata TP3-6 semua subjek',
  'Perbandingan TP3-6 BM dan BI'
];

function renderEjen() {
  const container = document.getElementById('ejen-content');
  container.innerHTML = `
    <div class="card chat-wrap">
      <div class="chat-hdr">
        <h2>🤖 Ejen PBD</h2>
        <p>Tanya soalan tentang data PBD SK Sungai Damit. Ejen menjawab berdasarkan data semasa.</p>
      </div>
      <div class="chat-msgs" id="chatMsgs">
        <div class="chat-msg bot">👋 Hai! Saya Ejen PBD. Tanya saya apa-apa tentang data prestasi murid.<div class="chat-suggest" id="chatSuggest">${SUGGESTIONS.map(s => `<button onclick="askEjen('${s.replace(/'/g, "\\'")}')">${s}</button>`).join('')}</div></div>
      </div>
      <div class="chat-input-wrap">
        <input class="chat-input" id="chatInput" placeholder="Taip soalan..." onkeydown="if(event.key==='Enter') sendChat()">
        <button class="chat-send" onclick="sendChat()">➤</button>
      </div>
    </div>
  `;
  document.getElementById('chatInput')?.focus();
}

function sendChat() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  addChatMsg('user', q);
  setTimeout(() => {
    const a = answerEjen(q);
    addChatMsg('bot', a);
  }, 300 + Math.random() * 400);
}

function addChatMsg(role, text) {
  const msgs = document.getElementById('chatMsgs');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'chat-msg ' + role;
  div.innerHTML = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function askEjen(q) {
  addChatMsg('user', q);
  setTimeout(() => {
    const a = answerEjen(q);
    addChatMsg('bot', a);
  }, 300 + Math.random() * 400);
}

function answerEjen(q) {
  const lower = q.toLowerCase();
  const period = S.period;
  const periodLabel = period === 'akhir' ? 'Akhir Tahun' : 'Pertengahan Tahun';
  const classes = MOCK.classes || [];
  const allSubjects = getAllSubjects();

  // Helper: get summary for a subject
  function subjSummary(sub) {
    const summary = MOCK.summary[sub];
    if (!summary || !summary[period]) return null;
    const data = summary[period];
    let total = 0, tp36 = 0, tp12 = 0;
    const counts = { TP1: 0, TP2: 0, TP3: 0, TP4: 0, TP5: 0, TP6: 0 };
    for (const cid of CLASS_IDS) {
      const c = data[cid];
      if (c) {
        total += c.total;
        tp36 += c.tp3to6;
        for (const tp of TP_LABELS) counts[tp] += (c.counts[tp] || 0);
      }
    }
    tp12 = total - tp36;
    return { total, tp36, tp12, tp36Pct: total > 0 ? Math.round(tp36 / total * 100) : 0, tp12Pct: total > 0 ? Math.round(tp12 / total * 100) : 0, counts };
  }

  // === SOALAN JENIS ===

  // Jumlah murid / berapa murid
  if (/jumlah\s+murid|berapa\s+murid|bilangan\s+murid|total\s+murid|keseluruhan\s+murid/i.test(q)) {
    let total = 0;
    for (const c of classes) total += c.students || 0;
    return `Jumlah murid keseluruhan: <span class="hl">${total}</span> orang (${periodLabel}).`;
  }

  // Jumlah kelas
  if (/jumlah\s+kelas|berapa\s+kelas|bilangan\s+kelas|senarai\s+kelas/i.test(q)) {
    return `Terdapat <span class="hl">${classes.length}</span> kelas:<br>${classes.map(c => `• ${c.name} (<span class="hl">${c.students}</span> murid)`).join('<br>')}`;
  }

  // Purata TP3-6 / overall / keseluruhan
  if (/purata|overall|keseluruhan|prestasi\s+keseluruhan/i.test(q)) {
    let totalTp36 = 0, totalAll = 0, cnt = 0;
    for (const sub of allSubjects) {
      const s = subjSummary(sub);
      if (s) { totalTp36 += s.tp36; totalAll += s.total; cnt++; }
    }
    const pct = totalAll > 0 ? Math.round(totalTp36 / totalAll * 100) : 0;
    return `Prestasi keseluruhan (${periodLabel}):<br>• TP3-6: <span class="hl">${totalTp36}</span> daripada ${totalAll} (<span class="hl">${pct}%</span>)<br>• TP1-2: ${totalAll - totalTp36} (${100 - pct}%)`;
  }

  // Subjek tertentu — TP3-6 / peratus / prestasi
  const subMatch = q.match(/(?:tp3-6|prestasi|peratus|tp|bagaimana)\s+(\w+)/i) || q.match(/(\w{2,4})\s+(?:tp3-6|prestasi|peratus)/i);
  if (subMatch) {
    const sub = subMatch[1].toUpperCase();
    if (allSubjects.includes(sub)) {
      const s = subjSummary(sub);
      if (s) {
        return `${sub} (${periodLabel}):<br>• Jumlah dinilai: <span class="hl">${s.total}</span><br>• TP3-6: ${s.tp36} (<span class="hl">${s.tp36Pct}%</span>)<br>• TP1-2: ${s.tp12} (${s.tp12Pct}%)<br>• Pecahan: TP1=${s.counts.TP1} TP2=${s.counts.TP2} TP3=${s.counts.TP3} TP4=${s.counts.TP4} TP5=${s.counts.TP5} TP6=${s.counts.TP6}`;
      }
      return `Tiada data ${sub} untuk ${periodLabel}.`;
    }
  }

  // TP3-6 tertinggi / terbaik / paling baik
  if (/tertinggi|terbaik|paling\s+baik|maksimum/i.test(q) && /tp3-6|peratus/i.test(q)) {
    let best = null, bestSub = '';
    for (const sub of allSubjects) {
      const s = subjSummary(sub);
      if (s && s.total > 0 && (!best || s.tp36Pct > best.tp36Pct)) { best = s; bestSub = sub; }
    }
    if (best) return `Subjek dengan TP3-6 tertinggi (${periodLabel}): <span class="hl">${bestSub}</span> — <span class="hl">${best.tp36Pct}%</span> (${best.tp36} daripada ${best.total}).`;
  }

  // TP3-6 terendah
  if (/terendah|paling\s+rendah|rendah|minimum/i.test(q) && /tp3-6|peratus/i.test(q)) {
    let worst = null, worstSub = '';
    for (const sub of allSubjects) {
      const s = subjSummary(sub);
      if (s && s.total > 0 && (!worst || s.tp36Pct < worst.tp36Pct)) { worst = s; worstSub = sub; }
    }
    if (worst) return `Subjek dengan TP3-6 terendah (${periodLabel}): <span class="hl">${worstSub}</span> — ${worst.tp36Pct}% (${worst.tp36} daripada ${worst.total}).`;
  }

  // Perbandingan dua subjek
  const compareMatch = q.match(/(?:banding|perbandingan|vs|dan)\s+(\w{2,4}).*(\w{2,4})/i);
  if (compareMatch && /banding|perbandingan|vs/i.test(q)) {
    const s1 = compareMatch[1].toUpperCase(), s2 = compareMatch[2].toUpperCase();
    if (allSubjects.includes(s1) && allSubjects.includes(s2)) {
      const a = subjSummary(s1), b = subjSummary(s2);
      if (a && b) return `Perbandingan ${s1} vs ${s2} (${periodLabel}):<br>• ${s1}: <span class="hl">${a.tp36Pct}%</span> TP3-6 (${a.tp36}/${a.total})<br>• ${s2}: <span class="hl">${b.tp36Pct}%</span> TP3-6 (${b.tp36}/${b.total})`;
    }
  }

  // TP1 / TP1-2 paling ramai
  if (/tp1|tp1-2/i.test(q) && /paling\s+ramai|terbanyak|tertinggi/i.test(q)) {
    let top = null, topSub = '';
    for (const sub of allSubjects) {
      const s = subjSummary(sub);
      if (s && s.tp12 > 0 && (!top || s.tp12 > top.tp12)) { top = s; topSub = sub; }
    }
    if (top) return `Subjek dengan TP1-2 terbanyak (${periodLabel}): <span class="hl">${topSub}</span> — ${top.tp12} murid (${top.tp12Pct}%).`;
  }

  // Mengikut kelas — kelas mana tertinggi tp3-6
  if (/kelas\s+mana|perbandingan\s+kelas|kelas\s+tertinggi/i.test(q)) {
    let bestClass = null, bestPct = 0;
    for (const c of classes) {
      const cid = CLASS_IDS.find(id => id === c.id);
      if (!cid) continue;
      const students = MOCK.students[cid]?.[period] || [];
      const subs = getClassSubjects(cid, period);
      let tp3 = 0, total = 0;
      for (const s of students) {
        for (const sub of subs) {
          const tp = s.subjects[sub];
          if (tp) { total++; if (['TP3','TP4','TP5','TP6'].includes(tp)) tp3++; }
        }
      }
      const pct = total > 0 ? Math.round(tp3 / total * 100) : 0;
      if (pct > bestPct) { bestPct = pct; bestClass = c.name; }
    }
    if (bestClass) return `Kelas dengan TP3-6 tertinggi (${periodLabel}): <span class="hl">${bestClass}</span> — <span class="hl">${bestPct}%</span>.`;
  }

  // Soalan subjek dan TP1 count
  const subCountMatch = q.match(/(?:berap|jumlah|bilangan|count)\s+(\w{2,4})\s+(?:tp|murid)/i);
  if (subCountMatch) {
    const sub = subCountMatch[1].toUpperCase();
    if (allSubjects.includes(sub)) {
      const s = subjSummary(sub);
      if (s) return `${sub} (${periodLabel}): ${s.total} murid dinilai. TP1=${s.counts.TP1}, TP2=${s.counts.TP2}, TP3=${s.counts.TP3}, TP4=${s.counts.TP4}, TP5=${s.counts.TP5}, TP6=${s.counts.TP6}.`;
    }
  }

  // Senarai semua subjek
  if (/senarai\s+subjek|subjek\s+apa|apa\s+subjek/i.test(q)) {
    return `Subjek yang dinilai (${periodLabel}): ${allSubjects.join(', ')}.`;
  }

  // Subjek paling ramai TP1
  if (/paling\s+ramai\s+tp1|tp1\s+terbanyak/i.test(q)) {
    let top = null, topVal = 0;
    for (const sub of allSubjects) {
      const s = subjSummary(sub);
      if (s && s.counts.TP1 > topVal) { topVal = s.counts.TP1; top = sub; }
    }
    if (top) return `Subjek paling ramai TP1 (${periodLabel}): <span class="hl">${top}</span> — ${topVal} murid.`;
  }

  // Subjek paling ramai TP6
  if (/paling\s+ramai\s+tp6|tp6\s+terbanyak/i.test(q)) {
    let top = null, topVal = 0;
    for (const sub of allSubjects) {
      const s = subjSummary(sub);
      if (s && s.counts.TP6 > topVal) { topVal = s.counts.TP6; top = sub; }
    }
    if (top) return `Subjek paling ramai TP6 (${periodLabel}): <span class="hl">${top}</span> — ${topVal} murid.`;
  }

  // Fallback — senarai soalan contoh
  return `Saya boleh jawab soalan seperti:<br>${SUGGESTIONS.map(s => `• <span class="hl">${s}</span>`).join('<br>')}<br><br>Cuba taip soalan di atas atau klik cadangan.`;
}

// Register ejen in renderPage
const origRenderPage = renderPage;
renderPage = function(page) {
  if (page === 'ejen') renderEjen();
  else origRenderPage(page);
};

function printReport() {
  window.print();
}

// ====== YEAR SELECTOR ======
function renderYearSelector() {
  const wrap = document.getElementById('year-btns');
  if (!wrap) return;
  wrap.innerHTML = (S.years || [YEAR]).map(yr =>
    `<button class="yr-btn${yr === S.year ? ' on' : ''}" data-yr="${yr}" onclick="switchYear('${yr}')">${yr}</button>`
  ).join('');
}

async function switchYear(yr) {
  if (S.year === yr) return;
  S.year = yr;
  YEAR = yr;
  document.querySelectorAll('.yr-btn').forEach(b => b.classList.toggle('on', b.dataset.yr === yr));
  const live = await loadLiveData();
  if (live) {
    document.getElementById('status-badge').textContent = 'LIVE';
    document.getElementById('status-badge').style.background = '#22c55e';
  }
  renderPage(S.page);
}

// ====== DATA SOURCE ======
function setDataSource(source) {
  S.dataSource = source;
  if (source === 'api') {
    fetchFromAPI();
  } else {
    renderPage(S.page);
  }
}

function setApiUrl(url) {
  S.apiUrl = url;
}

function fetchFromAPI() {
  if (!S.apiUrl) { alert('Sila tetapkan URL Google Apps Script terlebih dahulu.'); return; }
  document.querySelectorAll('.page').forEach(el => el.innerHTML = '<div class="loading"><div class="spin"></div><div>Memuat data dari Google Sheets...</div></div>');
  // Future: fetch(S.apiUrl + '?action=stats') etc.
}

// ====== INIT ======
document.addEventListener('DOMContentLoaded', () => {
  navigate('rumusan');
});
