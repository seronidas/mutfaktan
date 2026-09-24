document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const refParam = urlParams.get('ref') || 'MY26-0158';

  const appRefBadge = document.getElementById('appRefBadge');
  const applicantStatusBadge = document.getElementById('applicantStatusBadge');
  const applicantName = document.getElementById('applicantName');
  const applicantBusiness = document.getElementById('applicantBusiness');
  const applicantStructure = document.getElementById('applicantStructure');
  const applicantVkn = document.getElementById('applicantVkn');
  const sistemScoreDisplay = document.getElementById('sistemScoreDisplay');
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
  const storedEditor = JSON.parse(localStorage.getItem('editorUser') || localStorage.getItem('currentUser') || 'null');
  if (storedEditor && storedEditor.name) {
    if (currentEditorName) currentEditorName.textContent = storedEditor.name;
    if (currentEditorMail) currentEditorMail.textContent = storedEditor.email || 'editor@mutfaktanyarina.com';
  }

  let applications = JSON.parse(localStorage.getItem('programApplications') || '[]');
  let currentApp = applications.find(a => a.ref === refParam);

  if (!currentApp) {
    currentApp = {
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
      status: 'pending-score'
    };
  }

  if (appRefBadge) appRefBadge.textContent = `Ref: ${currentApp.ref}`;
  if (applicantName) applicantName.textContent = currentApp.name;
  if (applicantBusiness) applicantBusiness.textContent = currentApp.business;
  if (applicantStructure) applicantStructure.textContent = `${currentApp.structure} · ${currentApp.city}`;

  const sistemScore = currentApp.sistemScore || 52.5;
  if (sistemScoreDisplay) {
    sistemScoreDisplay.innerHTML = `${sistemScore} <span class="score-max">/ 70</span>`;
  }
  if (summarySistemScore) summarySistemScore.textContent = sistemScore;

  const storedAnswers = currentApp.applicantAnswers || JSON.parse(localStorage.getItem('onDegerlendirmeAnswers') || 'null');
  if (storedAnswers) {
    const a1 = document.getElementById('ansQ1');
    const a2 = document.getElementById('ansQ2');
    const a3 = document.getElementById('ansQ3');
    const a4 = document.getElementById('ansQ4');
    const a5 = document.getElementById('ansQ5');
    const a6 = document.getElementById('ansQ6');
    if (a1 && storedAnswers.q1) a1.textContent = `"${storedAnswers.q1}"`;
    if (a2 && storedAnswers.q2) a2.textContent = `"${storedAnswers.q2}"`;
    if (a3 && storedAnswers.q3) a3.textContent = `"${storedAnswers.q3}"`;
    if (a4 && storedAnswers.q4) a4.textContent = `"${storedAnswers.q4}"`;
    if (a5 && storedAnswers.q5) a5.textContent = `"${storedAnswers.q5}"`;
    if (a6 && storedAnswers.q6) a6.textContent = `"${storedAnswers.q6}"`;
  }

  const docSummaries = {
    sgk: {
      title: 'SGK Hizmet Listesi ve Barkodlu Resmî Belge',
      text: 'SGK Sigortalı Hizmet Listesi (2026/02 dönemi): İşletmede başvuru sahibi hariç 2 aktif kayıtlı SGK sigortalı personel bulunmaktadır. Çalışanların 2\'si de kadındır (%100 kadın istihdam oranı teyit edilmiştir). Geçen yıl da 2 çalışan bulunmakta olup çalışan sayısı korunmuştur. SGK hizmet dökümü e-devlet barkodlu ve doğrulanabilir durumdadır.'
    },
    vergi: {
      title: 'Güncel Vergi Levhası (2025 / 2026)',
      text: 'Gelir İdaresi Başkanlığı Vergi Levhası: İşe başlama tarihi 12.03.2022. Faaliyet kodu (NACE): 56.10.08 (Börek, mantı ve gözleme salonları). En az 2 yıllık ticari geçmiş ve vergi mükellefiyeti şartı teyit edilmiştir. Şahıs işletmesi kaydı adayın kimlik bilgileriyle örtüşmektedir.'
    },
    msa: {
      title: 'Mutfak Sanatları Akademisi (MSA) Başarı Sertifikası',
      text: 'Mutfaktan Yarına Eğitim ve Destek Programı Kapsamında Verilen MSA Dijital Gastronomi ve İşletmecilik Eğitimi Sertifikası. Sertifika No: MSA-2026-MY-09418. Değerlendirme Başarı Notu: 88 / 100. Şartnamede aranan en az 70 başarı puanı kriteri eksiksiz sağlanmıştır.'
    }
  };

  function setDocModal(isOpen, docKey) {
    if (!docPreviewModal) return;
    if (isOpen && docKey && docSummaries[docKey]) {
      docPreviewTitle.textContent = docSummaries[docKey].title;
      docPreviewBody.innerHTML = `<p>${docSummaries[docKey].text}</p>`;
      docPreviewModal.removeAttribute('hidden');
    } else {
      docPreviewModal.setAttribute('hidden', '');
    }
  }

  document.querySelectorAll('.btn-file-preview').forEach(btn => {
    btn.addEventListener('click', () => {
      const docKey = btn.getAttribute('data-doc');
      setDocModal(true, docKey);
    });
  });

  if (closeDocPreviewModal) {
    closeDocPreviewModal.addEventListener('click', () => setDocModal(false));
  }
  if (confirmDocPreview) {
    confirmDocPreview.addEventListener('click', () => setDocModal(false));
  }

  const rejectionBox = document.getElementById('rejection-box');
  const rejectionError = document.getElementById('rejection-error');
  const inpRejectionReason = document.getElementById('inp-rejection-reason');

  function checkVerificationStatus() {
    const hasInvalid = document.querySelector('.btn-toggle-status.active-invalid');
    if (hasInvalid) {
      if (rejectionBox) rejectionBox.removeAttribute('hidden');
    } else {
      if (rejectionBox) rejectionBox.setAttribute('hidden', '');
      if (rejectionError) rejectionError.setAttribute('hidden', '');
    }
  }

  const toggleButtons = document.querySelectorAll('.btn-toggle-status');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const groupKey = btn.getAttribute('data-v');
      const siblings = document.querySelectorAll(`.btn-toggle-status[data-v="${groupKey}"]`);
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

  function calculateScores() {
    let preTotal = 0;
    let answeredCount = 0;

    for (let i = 1; i <= 6; i++) {
      const selected = document.querySelector(`input[name="rubric_q${i}"]:checked`);
      const badge = document.getElementById(`scoreBadgeQ${i}`);
      const labels = document.querySelectorAll(`input[name="rubric_q${i}"]`);

      labels.forEach(radio => {
        const parentLabel = radio.closest('.rubric-option-label');
        if (parentLabel) {
          if (radio.checked) {
            parentLabel.classList.add('selected');
          } else {
            parentLabel.classList.remove('selected');
          }
        }
      });

      if (selected) {
        const pts = parseFloat(selected.value);
        preTotal += pts;
        answeredCount++;
        if (badge) badge.textContent = `${pts} Puan`;
      } else {
        if (badge) badge.textContent = '0 Puan';
      }
    }

    if (previewPreScore) {
      previewPreScore.innerHTML = `${preTotal} <span class="score-max">/ 30</span>`;
    }
    if (summaryPreScore) summaryPreScore.textContent = preTotal;

    const totalPreliminary = sistemScore + preTotal;
    if (summaryTotalScore) summaryTotalScore.textContent = totalPreliminary;

    return { preTotal, answeredCount, totalPreliminary };
  }

  for (let i = 1; i <= 6; i++) {
    const radios = document.querySelectorAll(`input[name="rubric_q${i}"]`);
    radios.forEach(radio => {
      radio.addEventListener('change', calculateScores);
    });
  }

  if (currentApp.preScore !== null && currentApp.preScore !== undefined) {
    const q1 = document.querySelector('input[name="rubric_q1"][value="5"]');
    const q2 = document.querySelector('input[name="rubric_q2"][value="5"]');
    const q3 = document.querySelector('input[name="rubric_q3"][value="5"]');
    const q4 = document.querySelector('input[name="rubric_q4"][value="3"]');
    const q5 = document.querySelector('input[name="rubric_q5"][value="3"]');
    const q6 = document.querySelector('input[name="rubric_q6"][value="5"]');
    if (q1) q1.checked = true;
    if (q2) q2.checked = true;
    if (q3) q3.checked = true;
    if (q4) q4.checked = true;
    if (q5) q5.checked = true;
    if (q6) q6.checked = true;
    calculateScores();
  }

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

      const hasInvalid = document.querySelector('.btn-toggle-status.active-invalid');
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

        const appIdx = applications.findIndex(a => a.ref === currentApp.ref);
        if (appIdx >= 0) applications[appIdx] = currentApp;
        else applications.push(currentApp);
        localStorage.setItem('programApplications', JSON.stringify(applications));

        if (applicantStatusBadge) {
          applicantStatusBadge.className = 'badge-status status-pending-verify';
          applicantStatusBadge.textContent = 'Belge Uyumsuzluğu / Elendi';
        }

        showBanner('Başvuru belge uyumsuzluğu tutanağı işlenerek elendi olarak kaydedildi. Yönlendiriliyorsunuz...', true);
        setTimeout(() => {
          window.location.href = 'editor-panel.html';
        }, 1400);
        return;
      }

      const { preTotal, answeredCount, totalPreliminary } = calculateScores();

      if (answeredCount < 6) {
        showBanner('Lütfen 6 sorunun tamamını puan cetvelinde işaretleyiniz.', false);
        return;
      }

      currentApp.preScore = preTotal;
      currentApp.totalScore = totalPreliminary;
      currentApp.status = 'scored';
      currentApp.statusText = `Puanlandı (${totalPreliminary} Puan)`;
      currentApp.evalNotes = evalNotes ? evalNotes.value.trim() : '';
      currentApp.evaluatedAt = new Date().toISOString();

      const appIdx = applications.findIndex(a => a.ref === currentApp.ref);
      if (appIdx >= 0) {
        applications[appIdx] = currentApp;
      } else {
        applications.push(currentApp);
      }
      localStorage.setItem('programApplications', JSON.stringify(applications));

      if (applicantStatusBadge) {
        applicantStatusBadge.className = 'badge-status status-scored';
        applicantStatusBadge.textContent = `Puanlandı (${totalPreliminary} Puan)`;
      }

      showBanner(`Ön Değerlendirme başarıyla kaydedildi! Toplam Ön Sıralama Puanı: ${totalPreliminary} / 100. Aday Jüri Sıralama Listesine güncellendi. Yönlendiriliyorsunuz...`, true);

      setTimeout(() => {
        window.location.href = 'editor-panel.html';
      }, 1400);
    });
  }
});
