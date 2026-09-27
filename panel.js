document.addEventListener('DOMContentLoaded', () => {
  // Basit istemci koruması (gerçek kimlik doğrulama arka uç işidir).
  const currentUser = MYUI.readJSON('currentUser');
  if (!currentUser || currentUser.role !== 'applicant') {
    window.location.replace('giris.html');
    return;
  }

  const modalEdit = document.getElementById('modal-edit-confirm');
  const btnOpenEdit = document.getElementById('btn-open-edit');
  const btnConfirmEdit = document.getElementById('btn-confirm-edit');
  const closeButtons = document.querySelectorAll('[data-close="modal-edit-confirm"]');
  const btnPrint = document.getElementById('btn-print');
  const btnLogout = document.getElementById('btn-logout');

  function getStoredData() {
    return MYUI.readJSON('mutfaktan_application') || MYUI.readJSON('mutfaktan_app_draft');
  }

  function isFilled(v) {
    return v !== null && v !== undefined && v !== '';
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && isFilled(value)) el.textContent = String(value);
  }

  function setVisible(el, visible) {
    if (!el) return;
    if (visible) {
      el.removeAttribute('hidden');
      el.style.display = '';
    } else {
      el.setAttribute('hidden', '');
      el.style.display = 'none';
    }
  }

  function formatBirth(v) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
    return m ? `${m[3]}.${m[2]}.${m[1]}` : v;
  }

  const appData = getStoredData();

  // Ön değerlendirme yanıtları yalnızca bu başvurunun ref numarasıyla eşleşiyorsa bu başvuruya aittir.
  const storedAnswers = MYUI.readJSON('onDegerlendirmeAnswers');
  const hasAnswers = !!(appData && appData.refNo && storedAnswers && storedAnswers.ref === appData.refNo);

  // Durum -> rozet metni ve süreç çizelgesindeki güncel adım (0 tabanlı).
  const STATUS_INFO = {
    draft: { text: 'Taslak — göndermeniz gerekiyor', stage: 0 },
    submitted: { text: 'Başvuru Alındı — İnceleme Aşamasında', stage: 1 },
    'preeval-open': { text: 'Ön Değerlendirme Aşaması Açıldı', stage: 2 }
  };

  let status = 'draft';
  if (appData) {
    status = appData.status || (appData.submittedAt ? 'submitted' : 'draft');
  }
  const statusInfo = STATUS_INFO[status] || STATUS_INFO.submitted;

  const statusTextEl = document.getElementById('status-text');
  if (statusTextEl) {
    if (!appData) {
      statusTextEl.textContent = 'Kayıtlı başvuru bulunamadı';
    } else if (status === 'preeval-open' && hasAnswers) {
      statusTextEl.textContent = 'Ön Değerlendirme Yanıtları Alındı';
    } else {
      statusTextEl.textContent = statusInfo.text;
    }
  }

  const timelineSteps = document.querySelectorAll('.timeline-steps > div');
  const stage = appData ? statusInfo.stage : 0;
  timelineSteps.forEach((step, i) => {
    step.classList.remove('completed', 'current', 'locked');
    const icon = step.firstElementChild;
    if (i < stage) {
      step.classList.add('completed');
      if (icon) icon.textContent = '✓';
    } else {
      step.classList.add(i === stage ? 'current' : 'locked');
      if (icon) icon.textContent = String(i + 1);
    }
  });

  if (appData) {
    setText('panel-username', appData.fullname || currentUser.name);
    setText('tbl-name', appData.fullname);
    setText('val-refno', appData.refNo);

    if (appData.submittedAt) {
      const d = new Date(appData.submittedAt);
      if (!isNaN(d.getTime())) {
        setText('val-date', d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }));
      }
    }

    if (isFilled(appData.birthdate)) setText('tbl-birth', formatBirth(appData.birthdate));
    setText('tbl-phone', appData.phone);
    setText('tbl-email', appData.email);
    setText('tbl-city', appData.city);
    setText('tbl-bizname', appData.bizname);

    if (isFilled(appData.biztype)) {
      const typeMap = {
        sahis: 'Şahıs İşletmesi',
        sirket: 'Şirket (Ltd. / A.Ş.)',
        kooperatif: 'Kadın Kooperatifi'
      };
      setText('tbl-biztype', typeMap[appData.biztype] || appData.biztype);
    }

    setText('tbl-taxno', appData.taxno);
    setText('tbl-bizyear', appData.bizyear);
    setText('tbl-address', appData.address);
    setText('tbl-msa', appData.fileName);

    if (isFilled(appData.q11)) setText('tbl-q11', `${appData.q11} Kişi`);

    if (isFilled(appData.q12)) {
      const total = parseInt(appData.q11, 10);
      const female = parseInt(appData.q12, 10);
      let ratio = '';
      if (total > 0 && !isNaN(female)) {
        ratio = ` (%${Math.round((female / total) * 100)})`;
      }
      setText('tbl-q12', `${appData.q12} Kişi${ratio}`);
    }

    if (isFilled(appData.q13)) setText('tbl-q13', `${appData.q13} Kişi`);

    if (isFilled(appData.q14)) {
      const map14 = {
        none: 'İşe başlayan olmadı',
        zero: 'Oldu, kimse kalmadı',
        less_half: 'Yarıdan azı',
        half_more: 'Yarısı ve fazlası',
        all: 'Tamamı'
      };
      setText('tbl-q14', map14[appData.q14] || appData.q14);
    }

    const yesNo = { yes: 'Evet', no: 'Hayır' };
    if (isFilled(appData.q15)) setText('tbl-q15', yesNo[appData.q15] || appData.q15);
    if (isFilled(appData.q21)) setText('tbl-q21', yesNo[appData.q21] || appData.q21);
  } else {
    setVisible(btnOpenEdit, false);
  }

  // Ön değerlendirme bandı yalnızca aşama açıkken görünür.
  const banner = document.getElementById('banner-preeval');
  setVisible(banner, !!appData && status === 'preeval-open');
  if (appData && status === 'preeval-open' && hasAnswers) {
    const bannerTitle = document.getElementById('preeval-banner-title');
    const bannerDesc = document.getElementById('preeval-banner-desc');
    const btnText = document.getElementById('btn-preeval-text');
    const btnLink = document.getElementById('btn-preeval-link');
    if (bannerTitle) bannerTitle.textContent = 'Ön Değerlendirme Yanıtlarınız Alındı';
    if (bannerDesc) bannerDesc.textContent = 'Yanıtlarınız kaydedilmiştir ve program ekibi tarafından incelenmektedir.';
    if (btnText) btnText.textContent = 'Cevaplarımı İncele';
    if (btnLink) btnLink.setAttribute('href', 'on-degerlendirme-formu.html?mode=view');
  }

  document.querySelectorAll('.accordion-group button').forEach(header => {
    header.addEventListener('click', () => {
      const card = header.parentElement;
      if (!card) return;
      const isOpen = card.classList.toggle('open');
      header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });

  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      try { localStorage.removeItem('currentUser'); } catch (err) {}
      window.location.href = 'giris.html';
    });
  }

  if (btnOpenEdit) {
    if (appData && status === 'draft') {
      // Taslak zaten düzenlenebilir durumda; onay penceresi gerekmez.
      const label = btnOpenEdit.querySelector('span');
      if (label) label.textContent = 'Başvuruya Devam Et';
      btnOpenEdit.addEventListener('click', () => {
        window.location.href = 'basvuru.html?mode=edit';
      });
    } else {
      btnOpenEdit.addEventListener('click', () => MYUI.openModal(modalEdit));
    }
  }

  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => MYUI.closeModal(modalEdit));
  });

  if (btnConfirmEdit) {
    btnConfirmEdit.addEventListener('click', () => {
      const current = getStoredData() || {};
      current.status = 'draft';
      current.updatedAt = new Date().toISOString();
      MYUI.writeJSON('mutfaktan_app_draft', current);
      MYUI.writeJSON('mutfaktan_application', current);
      window.location.href = 'basvuru.html?mode=edit';
    });
  }
});
