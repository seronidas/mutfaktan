document.addEventListener('DOMContentLoaded', () => {
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

  const storedEditor = JSON.parse(localStorage.getItem('editorUser') || localStorage.getItem('currentUser') || 'null');
  if (storedEditor && storedEditor.name) {
    if (currentEditorName) currentEditorName.textContent = storedEditor.name;
    if (currentEditorMail) currentEditorMail.textContent = storedEditor.email || 'editor@mutfaktanyarina.com';
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('currentUser');
      window.location.href = 'giris.html';
    });
  }

  const defaultApplications = [
    {
      ref: 'MY26-0042',
      name: 'Gülşah Güven',
      business: 'Gül Kadın Kooperatifi',
      structure: 'Kadın Kooperatifi',
      city: 'Hatay',
      totalEmployees: 6,
      femaleRatio: 100,
      sistemScore: 66,
      preScore: 26,
      totalScore: 92,
      status: 'scored',
      statusText: 'Puanlandı (92 Puan)'
    },
    {
      ref: 'MY26-0089',
      name: 'Zeynep Doğan',
      business: 'Zeynep Atölye Kafe',
      structure: 'Şahıs İşletmesi',
      city: 'İzmir',
      totalEmployees: 3,
      femaleRatio: 100,
      sistemScore: 58,
      preScore: 24,
      totalScore: 82,
      status: 'scored',
      statusText: 'Puanlandı (82 Puan)'
    },
    {
      ref: 'MY26-0115',
      name: 'Hatice Arslan',
      business: 'Arslan Yöresel Mutfak Ltd.',
      structure: 'Şirket',
      city: 'Gaziantep',
      totalEmployees: 20,
      femaleRatio: 75,
      sistemScore: 54,
      preScore: null,
      totalScore: null,
      status: 'pending-score',
      statusText: 'Ön Değerlendirme Bekliyor'
    },
    {
      ref: 'MY26-0158',
      name: 'Ayşe Yılmaz',
      business: 'Ayşe Hanım El Böreği',
      structure: 'Şahıs İşletmesi',
      city: 'Balıkesir',
      totalEmployees: 2,
      femaleRatio: 100,
      sistemScore: 52.5,
      preScore: null,
      totalScore: null,
      status: 'pending-score',
      statusText: 'Ön Değerlendirme Bekliyor'
    },
    {
      ref: 'MY26-0204',
      name: 'Fatma Çelik',
      business: 'Çelik Gastronomi A.Ş.',
      structure: 'Şirket',
      city: 'Adana',
      totalEmployees: 12,
      femaleRatio: 25,
      sistemScore: 32,
      preScore: null,
      totalScore: null,
      status: 'pending-verify',
      statusText: 'Belge Doğrulama Bekliyor'
    },
    {
      ref: 'MY26-0241',
      name: 'Emine Demir',
      business: 'Demir Karadeniz Lokantası',
      structure: 'Şahıs İşletmesi',
      city: 'Trabzon',
      totalEmployees: 8,
      femaleRatio: 25,
      sistemScore: 24,
      preScore: null,
      totalScore: null,
      status: 'pending-verify',
      statusText: 'Belge Doğrulama Bekliyor'
    }
  ];

  let applications = JSON.parse(localStorage.getItem('programApplications') || 'null');
  if (!applications) {
    applications = defaultApplications;
    localStorage.setItem('programApplications', JSON.stringify(applications));
  }

  let currentFilter = 'all';
  let searchQuery = '';

  function updateMetrics() {
    let pendingVerify = 0;
    let pendingScore = 0;
    let scored = 0;

    applications.forEach(app => {
      if (app.status === 'pending-verify') pendingVerify++;
      else if (app.status === 'pending-score') pendingScore++;
      else if (app.status === 'scored') scored++;
    });

    if (statTotalApps) statTotalApps.textContent = applications.length;
    if (statPendingDocs) statPendingDocs.textContent = pendingVerify;
    if (statPendingScore) statPendingScore.textContent = pendingScore;
    if (statCompleted) statCompleted.textContent = scored;
  }

  function renderTable() {
    if (!appsTableBody) return;
    appsTableBody.innerHTML = '';

    const sortedApps = [...applications].sort((a, b) => {
      if (a.totalScore !== null && b.totalScore !== null) {
        return b.totalScore - a.totalScore;
      }
      return b.sistemScore - a.sistemScore;
    });

    const filtered = sortedApps.filter(app => {
      if (currentFilter !== 'all' && app.status !== currentFilter) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = app.name.toLowerCase().includes(query);
        const matchBiz = app.business.toLowerCase().includes(query);
        const matchRef = app.ref.toLowerCase().includes(query);
        const matchCity = app.city.toLowerCase().includes(query);
        if (!matchName && !matchBiz && !matchRef && !matchCity) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '10');
      td.textContent = 'Kriterlere uygun başvuru bulunamadı.';
      td.className = 'table-empty-message';
      tr.appendChild(td);
      appsTableBody.appendChild(tr);
      return;
    }

    filtered.forEach((app, index) => {
      const tr = document.createElement('tr');

      const tdRank = document.createElement('td');
      const rankPill = document.createElement('span');
      rankPill.className = index < 25 ? 'rank-pill rank-top25' : 'rank-pill';
      rankPill.textContent = index + 1;
      tdRank.appendChild(rankPill);
      tr.appendChild(tdRank);

      const tdRef = document.createElement('td');
      tdRef.textContent = app.ref;
      tr.appendChild(tdRef);

      const tdApplicant = document.createElement('td');
      const colDiv = document.createElement('div');
      colDiv.className = 'applicant-col-main';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'applicant-name';
      nameSpan.textContent = app.name;
      const bizSpan = document.createElement('span');
      bizSpan.className = 'business-title';
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
      const sistemBadge = document.createElement('div');
      sistemBadge.className = 'score-badge score-sistem';
      sistemBadge.textContent = `${app.sistemScore} `;
      const sistemMax = document.createElement('span');
      sistemMax.className = 'score-max';
      sistemMax.textContent = '/ 70';
      sistemBadge.appendChild(sistemMax);
      tdSistem.appendChild(sistemBadge);
      tr.appendChild(tdSistem);

      const tdPre = document.createElement('td');
      if (app.preScore !== null) {
        const preBadge = document.createElement('div');
        preBadge.className = 'score-badge score-on';
        preBadge.textContent = `${app.preScore} `;
        const preMax = document.createElement('span');
        preMax.className = 'score-max';
        preMax.textContent = '/ 30';
        preBadge.appendChild(preMax);
        tdPre.appendChild(preBadge);
      } else {
        tdPre.textContent = '—';
      }
      tr.appendChild(tdPre);

      const tdTotal = document.createElement('td');
      if (app.totalScore !== null) {
        const totalBadge = document.createElement('div');
        totalBadge.className = 'score-badge score-total';
        totalBadge.textContent = `${app.totalScore} `;
        const totalMax = document.createElement('span');
        totalMax.className = 'score-max';
        totalMax.textContent = '/ 100';
        totalBadge.appendChild(totalMax);
        tdTotal.appendChild(totalBadge);
      } else {
        tdTotal.textContent = '—';
      }
      tr.appendChild(tdTotal);

      const tdStatus = document.createElement('td');
      const statusBadge = document.createElement('span');
      if (app.status === 'pending-verify') {
        statusBadge.className = 'badge-status status-pending-verify';
        statusBadge.textContent = 'Belge Doğrulama';
      } else if (app.status === 'pending-score') {
        statusBadge.className = 'badge-status status-pending-score';
        statusBadge.textContent = 'Ön Değerlendirme';
      } else {
        statusBadge.className = 'badge-status status-scored';
        statusBadge.textContent = 'Puanlandı';
      }
      tdStatus.appendChild(statusBadge);
      tr.appendChild(tdStatus);

      const tdAction = document.createElement('td');
      const actionLink = document.createElement('a');
      actionLink.href = `editor-degerlendirme.html?ref=${encodeURIComponent(app.ref)}`;
      actionLink.className = 'btn-table-action';
      actionLink.textContent = app.status === 'scored' ? 'İncele' : 'İncele ve Puanla';
      tdAction.appendChild(actionLink);
      tr.appendChild(tdAction);

      appsTableBody.appendChild(tr);
    });
  }

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
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
