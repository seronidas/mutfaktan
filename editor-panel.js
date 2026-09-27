document.addEventListener('DOMContentLoaded', () => {
  // Basit istemci koruması (gerçek kimlik doğrulama arka uç işidir).
  const currentUser = MYUI.readJSON('currentUser');
  if (!currentUser || currentUser.role !== 'editor') {
    window.location.replace('giris.html');
    return;
  }

  const currentEditorName = document.getElementById('currentEditorName');
  const currentEditorMail = document.getElementById('currentEditorMail');
  const btnLogout = document.getElementById('btnLogout');
  const appsTableBody = document.getElementById('appsTableBody');
  const filterTabs = document.querySelectorAll('.filter-tab');
  const searchInput = document.getElementById('appSearchInput');

  const statTotalApps = document.getElementById('statTotalApps');
  const statPendingDocs = document.getElementById('statPendingDocs');
  const statPendingScore = document.getElementById('statPendingScore');
  const statCompleted = document.getElementById('statCompleted');
  const statRejected = document.getElementById('statRejected');

  const storedEditor = MYUI.readJSON('editorUser') || currentUser;
  if (currentEditorName) currentEditorName.textContent = storedEditor.name || storedEditor.email || '';
  if (currentEditorMail) currentEditorMail.textContent = storedEditor.email || '';

  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      try { localStorage.removeItem('currentUser'); } catch (err) {}
      window.location.href = 'giris.html';
    });
  }

  const applications = MYDemo.getApplications();

  let currentFilter = 'all';
  let searchQuery = '';

  const KNOWN_STATUSES = ['pending-verify', 'pending-score', 'scored', 'rejected'];

  // Bilinmeyen durum, ilk aşama olarak sayılır; böylece toplam her zaman kovaların toplamına eşit kalır.
  function statusOf(app) {
    return KNOWN_STATUSES.indexOf(app.status) >= 0 ? app.status : 'pending-verify';
  }

  function num(v) {
    const n = Number(v);
    return v === null || v === undefined || v === '' || !Number.isFinite(n) ? null : n;
  }

  // Toplam Ön Sıralama Puanı oluşmuş (puanlanmış) kayıtlar birinci gruptur.
  function isRanked(app) {
    return statusOf(app) === 'scored' && num(app.totalScore) !== null;
  }

  function compareApps(a, b) {
    const ra = isRanked(a);
    const rb = isRanked(b);
    if (ra !== rb) return ra ? -1 : 1;
    if (ra) {
      const diff = num(b.totalScore) - num(a.totalScore);
      if (diff) return diff;
    }
    const sysDiff = (num(b.sistemScore) || 0) - (num(a.sistemScore) || 0);
    if (sysDiff) return sysDiff;
    return String(a.ref).localeCompare(String(b.ref));
  }

  // Jüri Aday Listesi: ilk 25 + 25. ile eşit puanlıların tamamı (yalnızca puanlanmış, elenmemiş kayıtlar).
  function juryRefSet() {
    const candidates = applications
      .filter(isRanked)
      .map(a => ({ ref: a.ref, totalScore: num(a.totalScore) }));
    const result = MYScoring.juryCandidates(candidates) || [];
    return new Set(result.map(item => (typeof item === 'string' ? item : item.ref)));
  }

  function updateMetrics() {
    const counts = { 'pending-verify': 0, 'pending-score': 0, scored: 0, rejected: 0 };
    applications.forEach(app => {
      counts[statusOf(app)]++;
    });

    if (statTotalApps) statTotalApps.textContent = applications.length;
    if (statPendingDocs) statPendingDocs.textContent = counts['pending-verify'];
    if (statPendingScore) statPendingScore.textContent = counts['pending-score'];
    if (statCompleted) statCompleted.textContent = counts.scored;
    if (statRejected) statRejected.textContent = counts.rejected;
  }

  function scoreBadge(className, value, max) {
    const badge = document.createElement('div');
    badge.className = className;
    badge.textContent = `${value} `;
    const maxEl = document.createElement('span');
    maxEl.textContent = `/ ${max}`;
    badge.appendChild(maxEl);
    return badge;
  }

  function renderTable() {
    if (!appsTableBody) return;
    appsTableBody.replaceChildren();

    // Sıra numarası filtrelenmemiş listeye göre verilir; arama ve sekme sırayı değiştirmez.
    const jury = juryRefSet();
    const ranked = [...applications].sort(compareApps).map((app, index) => ({ app, rank: index + 1 }));

    const query = searchQuery.toLocaleLowerCase('tr-TR');
    const filtered = ranked.filter(({ app }) => {
      if (currentFilter !== 'all' && statusOf(app) !== currentFilter) {
        return false;
      }
      if (query) {
        const fields = [app.name, app.business, app.ref, app.city];
        const hit = fields.some(f => String(f || '').toLocaleLowerCase('tr-TR').includes(query));
        if (!hit) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '10');
      td.textContent = 'Kriterlere uygun başvuru bulunamadı.';
      tr.appendChild(td);
      appsTableBody.appendChild(tr);
      return;
    }

    filtered.forEach(({ app, rank }) => {
      const status = statusOf(app);
      const inJury = jury.has(app.ref);
      const tr = document.createElement('tr');

      const tdRank = document.createElement('td');
      const rankPill = document.createElement('span');
      rankPill.className = inJury ? 'rank-pill rank-top25' : 'rank-pill';
      rankPill.textContent = rank;
      tdRank.appendChild(rankPill);
      tr.appendChild(tdRank);

      const tdRef = document.createElement('td');
      tdRef.textContent = app.ref;
      tr.appendChild(tdRef);

      const tdApplicant = document.createElement('td');
      const colDiv = document.createElement('div');
      colDiv.className = 'applicant-col-main';
      const nameSpan = document.createElement('strong');
      nameSpan.textContent = app.name;
      const bizSpan = document.createElement('span');
      bizSpan.textContent = app.business;
      colDiv.appendChild(nameSpan);
      colDiv.appendChild(bizSpan);
      tdApplicant.appendChild(colDiv);
      tr.appendChild(tdApplicant);

      const tdCity = document.createElement('td');
      tdCity.textContent = `${app.city} · ${app.structure}`;
      tr.appendChild(tdCity);

      const tdEmp = document.createElement('td');
      tdEmp.textContent = `${app.totalEmployees} SGK (%${app.femaleRatio} Kadın)`;
      tr.appendChild(tdEmp);

      const tdSistem = document.createElement('td');
      const sistem = num(app.sistemScore);
      if (sistem !== null) {
        tdSistem.appendChild(scoreBadge('score-badge score-sistem', sistem, 70));
      } else {
        tdSistem.textContent = '—';
      }
      tr.appendChild(tdSistem);

      const tdPre = document.createElement('td');
      if (num(app.preScore) !== null) {
        tdPre.appendChild(scoreBadge('score-badge score-on', app.preScore, 30));
      } else {
        tdPre.textContent = '—';
      }
      tr.appendChild(tdPre);

      const tdTotal = document.createElement('td');
      if (num(app.totalScore) !== null) {
        tdTotal.appendChild(scoreBadge('score-badge score-total', app.totalScore, 100));
      } else {
        tdTotal.textContent = '—';
      }
      tr.appendChild(tdTotal);

      const tdStatus = document.createElement('td');
      const statusBadge = document.createElement('span');
      if (status === 'pending-verify') {
        statusBadge.className = 'badge-status status-pending-verify';
        statusBadge.textContent = 'Belge Doğrulama';
      } else if (status === 'pending-score') {
        statusBadge.className = 'badge-status status-pending-score';
        statusBadge.textContent = 'Ön Değerlendirme';
      } else if (status === 'rejected') {
        statusBadge.className = 'badge-status status-rejected';
        statusBadge.textContent = 'Elendi';
      } else {
        statusBadge.className = 'badge-status status-scored';
        statusBadge.textContent = 'Puanlandı';
      }
      tdStatus.appendChild(statusBadge);
      if (inJury) {
        const juryBadge = document.createElement('span');
        juryBadge.className = 'badge-status status-jury';
        juryBadge.textContent = 'Jüri Aday Listesi';
        tdStatus.appendChild(juryBadge);
      }
      tr.appendChild(tdStatus);

      const tdAction = document.createElement('td');
      const actionLink = document.createElement('a');
      actionLink.href = `editor-degerlendirme.html?ref=${encodeURIComponent(app.ref)}`;
      actionLink.className = 'btn-table-action';
      actionLink.textContent = status === 'scored' || status === 'rejected' ? 'İncele' : 'İncele ve Puanla';
      tdAction.appendChild(actionLink);
      tr.appendChild(tdAction);

      appsTableBody.appendChild(tr);
    });
  }

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-pressed', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-pressed', 'true');
      currentFilter = tab.getAttribute('data-filter');
      renderTable();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim();
      renderTable();
    });
  }

  updateMetrics();
  renderTable();
});
