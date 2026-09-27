document.addEventListener('DOMContentLoaded', () => {
  // Basit istemci koruması (gerçek kimlik doğrulama arka uç işidir).
  const currentUser = MYUI.readJSON('currentUser');
  if (!currentUser || currentUser.role !== 'editor') {
    window.location.replace('giris.html');
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const refParam = urlParams.get('ref');

  const appRefBadge = document.getElementById('appRefBadge');
  const applicantStatusBadge = document.getElementById('applicantStatusBadge');
  const applicantName = document.getElementById('applicantName');
  const applicantAge = document.getElementById('applicantAge');
  const applicantBusiness = document.getElementById('applicantBusiness');
  const applicantStructure = document.getElementById('applicantStructure');
  const applicantVkn = document.getElementById('applicantVkn');
  const applicantSpace = document.getElementById('applicantSpace');
  const sistemScoreDisplay = document.getElementById('sistemScoreDisplay');
  const scoreDataGrid = document.getElementById('scoreDataGrid');
  const docFilesList = document.getElementById('docFilesList');
  const summarySistemScore = document.getElementById('summarySistemScore');
  const summaryPreScore = document.getElementById('summaryPreScore');
  const summaryTotalScore = document.getElementById('summaryTotalScore');
  const previewPreScore = document.getElementById('previewPreScore');
  const saveFeedback = document.getElementById('saveFeedback');
  const evalNotes = document.getElementById('evalNotes');
  const evaluationForm = document.getElementById('evaluationForm');

  const docPreviewModal = document.getElementById('docPreviewModal');
  const docPreviewTitle = document.getElementById('docPreviewTitle');
  const docPreviewBody = document.getElementById('docPreviewBody');
  const closeDocPreviewModal = document.getElementById('closeDocPreviewModal');
  const confirmDocPreview = document.getElementById('confirmDocPreview');

  const currentEditorName = document.getElementById('currentEditorName');
  const currentEditorMail = document.getElementById('currentEditorMail');
  const btnLogout = document.getElementById('btnLogout');

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
  const currentApp = refParam ? applications.find(a => a.ref === refParam) : null;

  // Bilinmeyen veya eksik ?ref= sessizce başka bir başvuruya düşmez.
  if (!currentApp) {
    const main = document.querySelector('main');
    if (main) {
      const box = document.createElement('div');
      box.className = 'card-heading';
      const h1 = document.createElement('h1');
      h1.textContent = 'Başvuru bulunamadı';
      const p = document.createElement('p');
      p.textContent = refParam
        ? `"${refParam}" numaralı başvuru kayıtlarda yok.`
        : 'Görüntülenecek bir başvuru seçilmedi.';
      const link = document.createElement('a');
      link.href = 'editor-panel.html';
      link.className = 'btn-table-action';
      link.textContent = 'Başvuru Listesine Dön';
      box.append(h1, p, link);
      main.replaceChildren(box);
    }
    return;
  }

  const details = currentApp.details || {};
  const bizType = MYDemo.bizTypeOf(currentApp);
  const askQ2 = bizType === 'sirket';

  function num(v) {
    const n = Number(v);
    return v === null || v === undefined || v === '' || !Number.isFinite(n) ? null : n;
  }

  function isFilled(v) {
    return v !== null && v !== undefined && v !== '';
  }

  // Puan rozeti: "değer / azami" (kullanıcı verisi HTML olarak yorumlanmaz).
  function setScore(el, value, max) {
    if (!el) return;
    el.replaceChildren();
    if (value === null) {
      el.textContent = '-';
      return;
    }
    el.append(document.createTextNode(`${value} `));
    const maxEl = document.createElement('span');
    maxEl.textContent = `/ ${max}`;
    el.append(maxEl);
  }

  // Künye
  if (appRefBadge) appRefBadge.textContent = `Ref: ${currentApp.ref}`;
  if (applicantName) applicantName.textContent = currentApp.name || '-';
  if (applicantBusiness) applicantBusiness.textContent = currentApp.business || '-';
  if (applicantStructure) applicantStructure.textContent = `${currentApp.structure || '-'} · ${currentApp.city || '-'}`;
  if (applicantVkn) applicantVkn.textContent = isFilled(details.taxno) ? details.taxno : '-';
  if (applicantSpace) applicantSpace.textContent = isFilled(details.bizyear) ? details.bizyear : '-';
  if (applicantAge) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(details.birthdate || ''));
    if (m) {
      const eligible = MYScoring.isAgeEligible(details.birthdate);
      applicantAge.textContent = `${m[3]}.${m[2]}.${m[1]} — Yaş şartı: ${eligible ? 'Uygun' : 'Uygun değil'}`;
    } else {
      applicantAge.textContent = '-';
    }
  }

  const STATUS_LABELS = { yes: 'Evet', no: 'Hayır' };
  const Q14_LABELS = {
    none: 'İşe başlayan olmadı',
    zero: 'Oldu, kimse kalmadı',
    less_half: 'Yarıdan azı',
    half_more: 'Yarısı ve fazlası',
    all: 'Tamamı'
  };
  const Q22_LABELS = {
    mutfak: 'Mutfak',
    masa: 'Masa',
    istihdam: 'İstihdam',
    dekorasyon: 'Dekorasyon',
    tanitim: 'Tanıtım',
    borc: 'Borç'
  };

  // Sistem Puanı: kayıtlı değer; yoksa başvuru yanıtlarından hesaplanır. 0 geçerli bir puandır.
  let scoreResult = null;
  if (isFilled(details.q11)) {
    try {
      scoreResult = MYScoring.systemScore({
        biztype: bizType,
        q11: Number(details.q11),
        q12: Number(details.q12),
        q13: Number(details.q13),
        q14: details.q14,
        q15: details.q15,
        q21: details.q21,
        q22: Array.isArray(details.q22) ? details.q22 : []
      });
    } catch (e) {
      scoreResult = null;
    }
  }
  let sistemScore = num(currentApp.sistemScore);
  if (sistemScore === null && scoreResult) sistemScore = scoreResult.total;

  setScore(sistemScoreDisplay, sistemScore, 70);
  if (summarySistemScore) summarySistemScore.textContent = sistemScore === null ? '-' : sistemScore;

  function addScoreItem(label, value) {
    if (!scoreDataGrid) return;
    const block = document.createElement('div');
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    const valEl = document.createElement('strong');
    valEl.textContent = value;
    block.append(labelEl, valEl);
    scoreDataGrid.appendChild(block);
  }

  function withPoints(text, pts) {
    return num(pts) === null ? text : `${text} — ${pts} Puan`;
  }

  function buildScoreGrid() {
    if (!scoreDataGrid) return;
    scoreDataGrid.replaceChildren();

    if (!scoreResult) {
      if (isFilled(currentApp.totalEmployees)) {
        addScoreItem('1.1 & 1.2 İstihdam', `${currentApp.totalEmployees} SGK'lı, %${currentApp.femaleRatio} kadın`);
      }
      addScoreItem('Puan Dökümü', 'Bu kayıtta madde bazlı puan bilgisi bulunmuyor.');
      return;
    }

    const items = scoreResult.items || {};
    addScoreItem('1.1 Toplam SGK\'lı (kendisi hariç)', `${details.q11} kişi (puanlanmaz)`);
    addScoreItem('1.2 Kadın Çalışan Oranı', withPoints(`${details.q12} kadın / ${details.q11} toplam`, items.q12));
    addScoreItem('1.3 Bir Yıl Önceki Çalışan Sayısı', withPoints(`${details.q13} kişi`, items.q13));
    addScoreItem('1.4 İşe Başlayanlardan Kalan', withPoints(Q14_LABELS[details.q14] || details.q14 || '-', items.q14));
    addScoreItem('1.5 Hibeyle İşe Alım', withPoints(STATUS_LABELS[details.q15] || details.q15 || '-', items.q15));
    const q21Text = bizType === 'kooperatif' ? 'Kooperatif' : (STATUS_LABELS[details.q21] || details.q21 || '-');
    addScoreItem('2.1 Tek Geçim Kaynağı', withPoints(q21Text, items.q21));
    const q22Text = Array.isArray(details.q22) && details.q22.length
      ? details.q22.map(k => Q22_LABELS[k] || k).join(' + ')
      : '-';
    addScoreItem('2.2 Hibe Kullanım Alanı', withPoints(q22Text, items.q22));
  }
  buildScoreGrid();

  // Belgeler: yalnızca başvuruda gerçekten kayıtlı olan veri gösterilir.
  function openDocModal(title, text) {
    if (!docPreviewModal) return;
    docPreviewTitle.textContent = title;
    const p = document.createElement('p');
    p.textContent = text;
    docPreviewBody.replaceChildren(p);
    MYUI.openModal(docPreviewModal);
  }

  function buildDocList() {
    if (!docFilesList) return;
    docFilesList.replaceChildren();

    const item = document.createElement('div');
    const text = document.createElement('div');
    const nameEl = document.createElement('strong');
    const metaEl = document.createElement('small');

    if (isFilled(details.fileName)) {
      nameEl.textContent = details.fileName;
      metaEl.textContent = 'MSA Sertifikası';
    } else {
      nameEl.textContent = 'MSA Sertifikası';
      metaEl.textContent = 'Belge henüz yüklenmedi.';
    }
    text.append(nameEl, metaEl);
    item.appendChild(text);

    if (isFilled(details.fileName)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Belgeyi İncele';
      btn.addEventListener('click', () => openDocModal('MSA Sertifikası', `Dosya adı: ${details.fileName}`));
      item.appendChild(btn);
    }
    docFilesList.appendChild(item);
  }
  buildDocList();

  if (closeDocPreviewModal) {
    closeDocPreviewModal.addEventListener('click', () => MYUI.closeModal(docPreviewModal));
  }
  if (confirmDocPreview) {
    confirmDocPreview.addEventListener('click', () => MYUI.closeModal(docPreviewModal));
  }

  // Adayın yazılı cevapları (yalnızca bu başvuruya kaydedilmiş olanlar).
  const storedAnswers = currentApp.applicantAnswers || null;
  for (let n = 1; n <= 6; n++) {
    const el = document.getElementById(`ansQ${n}`);
    if (!el) continue;
    if (n === 2 && !askQ2) {
      el.textContent = 'Bu soru şahıs işletmeleri ve kadın kooperatifleri için sorulmaz (doğrudan 5 puan).';
    } else if (storedAnswers && storedAnswers[`q${n}`]) {
      el.textContent = `"${storedAnswers[`q${n}`]}"`;
    } else {
      el.textContent = 'Kayıtlı yanıt bulunmuyor.';
    }
  }

  // Durum rozeti
  function renderStatusBadge() {
    if (!applicantStatusBadge) return;
    const status = currentApp.status;
    if (status === 'scored') {
      applicantStatusBadge.className = 'badge-status status-scored';
      applicantStatusBadge.textContent = `Puanlandı (${currentApp.totalScore} Puan)`;
    } else if (status === 'rejected') {
      applicantStatusBadge.className = 'badge-status status-pending-verify status-rejected';
      applicantStatusBadge.textContent = 'Elendi';
    } else if (status === 'pending-verify') {
      applicantStatusBadge.className = 'badge-status status-pending-verify';
      applicantStatusBadge.textContent = 'Belge Doğrulama Bekliyor';
    } else {
      applicantStatusBadge.className = 'badge-status status-pending-score';
      applicantStatusBadge.textContent = 'Ön Değerlendirme Aşamasında';
    }
  }
  renderStatusBadge();

  if (evalNotes && currentApp.evalNotes) evalNotes.value = currentApp.evalNotes;

  const rejectionBox = document.getElementById('rejection-box');
  const rejectionError = document.getElementById('rejection-error');
  const inpRejectionReason = document.getElementById('inp-rejection-reason');

  function checkVerificationStatus() {
    const hasInvalid = document.querySelector('[data-v].active-invalid');
    if (hasInvalid) {
      if (rejectionBox) rejectionBox.removeAttribute('hidden');
    } else {
      if (rejectionBox) rejectionBox.setAttribute('hidden', '');
      if (rejectionError) rejectionError.setAttribute('hidden', '');
    }
  }

  const toggleButtons = document.querySelectorAll('[data-v]');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const groupKey = btn.getAttribute('data-v');
      const siblings = document.querySelectorAll(`[data-v="${groupKey}"]`);
      siblings.forEach(s => s.classList.remove('active-valid', 'active-invalid'));
      const status = btn.getAttribute('data-status');
      if (status === 'valid') {
        btn.classList.add('active-valid');
      } else {
        btn.classList.add('active-invalid');
      }
      checkVerificationStatus();
    });
  });

  // Ön Değerlendirme cetveli
  function readRubric() {
    const rubric = [];
    for (let i = 1; i <= 6; i++) {
      const selected = document.querySelector(`input[name="rubric_q${i}"]:checked`);
      rubric.push(selected ? Number(selected.value) : null);
    }
    return rubric;
  }

  // Kayıtlı madde puanları yoksa (yalnızca toplam varsa) ilk görünümde kayıtlı toplamlar gösterilir.
  const savedRubric = Array.isArray(currentApp.rubric) && currentApp.rubric.length === 6 ? currentApp.rubric : null;
  let useStoredTotals = !savedRubric && num(currentApp.preScore) !== null;

  function renderSummary() {
    const rubric = readRubric();

    for (let i = 1; i <= 6; i++) {
      const badge = document.getElementById(`scoreBadgeQ${i}`);
      document.querySelectorAll(`input[name="rubric_q${i}"]`).forEach(radio => {
        const parentLabel = radio.closest('label');
        if (parentLabel) parentLabel.classList.toggle('selected', radio.checked);
      });
      const pts = rubric[i - 1];
      if (badge) badge.textContent = `${pts === null ? 0 : pts} Puan`;
    }

    let preTotal;
    let total;
    if (useStoredTotals) {
      preTotal = num(currentApp.preScore);
      total = num(currentApp.totalScore);
    } else {
      preTotal = MYScoring.preTotal(rubric.map(v => (v === null ? 0 : v)));
      total = sistemScore === null ? null : MYScoring.totalPre(sistemScore, preTotal);
    }

    setScore(previewPreScore, preTotal, 30);
    if (summaryPreScore) summaryPreScore.textContent = preTotal;
    if (summaryTotalScore) summaryTotalScore.textContent = total === null ? '-' : total;
  }

  for (let i = 1; i <= 6; i++) {
    document.querySelectorAll(`input[name="rubric_q${i}"]`).forEach(radio => {
      radio.addEventListener('change', () => {
        useStoredTotals = false;
        renderSummary();
      });
    });
  }

  // Kayıtlı madde puanlarını geri yükle.
  if (savedRubric) {
    savedRubric.forEach((v, idx) => {
      if (v === null || v === undefined) return;
      const radio = document.querySelector(`input[name="rubric_q${idx + 1}"][value="${v}"]`);
      if (radio) radio.checked = true;
    });
  }

  // Ö2 yalnızca Şirket seçenlere sorulur; şahıs ve kooperatifte otomatik 5 puan, devre dışı.
  if (!askQ2) {
    document.querySelectorAll('input[name="rubric_q2"]').forEach(radio => {
      radio.checked = radio.value === '5';
      radio.disabled = true;
    });
    const q2Badge = document.getElementById('scoreBadgeQ2');
    const header = q2Badge ? q2Badge.closest('h3') : null;
    if (header) {
      const note = document.createElement('p');
      note.textContent = 'Şahıs işletmeleri ve kadın kooperatiflerinde bu soru sorulmaz; otomatik 5 puan verilir.';
      header.insertAdjacentElement('afterend', note);
    }
  }
  renderSummary();

  function showBanner(msg, isSuccess) {
    if (!saveFeedback) return;
    saveFeedback.textContent = msg;
    saveFeedback.className = isSuccess ? 'feedback-banner feedback-success' : 'feedback-banner feedback-error';
    saveFeedback.removeAttribute('hidden');
    saveFeedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (evaluationForm) {
    evaluationForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const hasInvalid = document.querySelector('[data-v].active-invalid');
      if (hasInvalid) {
        const reasonVal = inpRejectionReason ? inpRejectionReason.value.trim() : '';
        if (!reasonVal) {
          if (rejectionError) rejectionError.removeAttribute('hidden');
          if (inpRejectionReason) inpRejectionReason.focus();
          showBanner('Belge veya şart uyumsuzluğu tespit edildiğinde gerekçe yazılması zorunludur.', false);
          return;
        }

        currentApp.status = 'rejected';
        currentApp.statusText = 'Belge Uyumsuzluğu / Elendi';
        currentApp.rejectionReason = reasonVal;
        currentApp.evaluatedAt = new Date().toISOString();
        MYDemo.saveApplications(applications);

        renderStatusBadge();

        showBanner('Başvuru belge uyumsuzluğu tutanağı işlenerek elendi olarak kaydedildi. Yönlendiriliyorsunuz...', true);
        setTimeout(() => {
          window.location.href = 'editor-panel.html';
        }, 1400);
        return;
      }

      const rubric = readRubric();
      if (rubric.some(v => v === null)) {
        showBanner('Lütfen 6 sorunun tamamını puan cetvelinde işaretleyiniz.', false);
        return;
      }
      if (sistemScore === null) {
        showBanner('Bu başvuruda kayıtlı Sistem Puanı bulunmadığı için Toplam Ön Sıralama Puanı hesaplanamıyor.', false);
        return;
      }

      const preTotal = MYScoring.preTotal(rubric);
      const totalScore = MYScoring.totalPre(sistemScore, preTotal);

      currentApp.sistemScore = sistemScore;
      currentApp.rubric = rubric;
      currentApp.preScore = preTotal;
      currentApp.totalScore = totalScore;
      currentApp.status = 'scored';
      currentApp.statusText = `Puanlandı (${totalScore} Puan)`;
      currentApp.evalNotes = evalNotes ? evalNotes.value.trim() : '';
      currentApp.evaluatedAt = new Date().toISOString();
      delete currentApp.rejectionReason;
      MYDemo.saveApplications(applications);

      renderStatusBadge();

      showBanner(`Ön Değerlendirme başarıyla kaydedildi. Toplam Ön Sıralama Puanı: ${totalScore} / 100. Yönlendiriliyorsunuz...`, true);

      setTimeout(() => {
        window.location.href = 'editor-panel.html';
      }, 1400);
    });
  }
});
