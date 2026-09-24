document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('preeval-form');
  const submitBtn = document.getElementById('btn-submit-preeval');
  const confirmCheck = document.getElementById('preeval-confirm');
  const feedbackBox = document.getElementById('preeval-feedback');
  const userEl = document.getElementById('preeval-username');
  const statusBadge = document.getElementById('preeval-status-badge');

  const urlParams = new URLSearchParams(window.location.search);
  const isViewMode = urlParams.get('mode') === 'view';

  try {
    const appData = JSON.parse(localStorage.getItem('mutfaktan_application') || localStorage.getItem('currentUser') || 'null');
    if (appData && (appData.fullname || appData.name)) {
      if (userEl) userEl.textContent = appData.fullname || appData.name;
    }
  } catch (e) {}

  const textareas = [
    { id: 'ans-q1', countId: 'count-q1' },
    { id: 'ans-q2', countId: 'count-q2' },
    { id: 'ans-q3', countId: 'count-q3' },
    { id: 'ans-q4', countId: 'count-q4' },
    { id: 'ans-q5', countId: 'count-q5' },
    { id: 'ans-q6', countId: 'count-q6' }
  ];

  textareas.forEach(item => {
    const el = document.getElementById(item.id);
    const countEl = document.getElementById(item.countId);
    if (el && countEl) {
      el.addEventListener('input', () => {
        countEl.textContent = el.value.length;
      });
    }
  });

  const existingAnswers = JSON.parse(localStorage.getItem('onDegerlendirmeAnswers') || 'null');
  if (existingAnswers) {
    textareas.forEach((item, idx) => {
      const el = document.getElementById(item.id);
      const key = `q${idx + 1}`;
      if (el && existingAnswers[key]) {
        el.value = existingAnswers[key];
        const countEl = document.getElementById(item.countId);
        if (countEl) countEl.textContent = el.value.length;
      }
    });

    if (isViewMode) {
      textareas.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) el.setAttribute('readonly', '');
      });
      if (confirmCheck) {
        confirmCheck.checked = true;
        confirmCheck.disabled = true;
      }
      if (submitBtn) submitBtn.setAttribute('hidden', '');
      if (statusBadge) {
        statusBadge.textContent = 'Cevaplar Gönderildi';
      }
      if (feedbackBox) {
        feedbackBox.innerHTML = `<div><h3>Ön Değerlendirme Yanıtlarınız Alındı</h3><p>Verdiğiniz yanıtlar başarıyla kaydedilmiş olup Değerlendirme Kurulu (editörler) tarafından incelenmektedir.</p></div>`;
        feedbackBox.removeAttribute('hidden');
      }
    }
  }

  if (form && !isViewMode) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      let allFilled = true;
      const answers = {};

      textareas.forEach((item, idx) => {
        const el = document.getElementById(item.id);
        const val = el ? el.value.trim() : '';
        if (!val) {
          allFilled = false;
        }
        answers[`q${idx + 1}`] = val;
      });

      if (!allFilled) {
        alert('Lütfen 6 sorunun tamamını yanıtlayınız.');
        return;
      }

      if (!confirmCheck.checked) {
        alert('Lütfen doğruluk beyanını onaylayınız.');
        return;
      }

      answers.submittedAt = new Date().toISOString();
      localStorage.setItem('onDegerlendirmeAnswers', JSON.stringify(answers));

      let applications = JSON.parse(localStorage.getItem('programApplications') || 'null');
      if (applications) {
        const targetApp = applications.find(a => a.ref === 'MY26-0158') || applications[3];
        if (targetApp) {
          targetApp.status = 'pending-score';
          targetApp.statusText = 'Ön Değerlendirme Bekliyor';
          targetApp.applicantAnswers = answers;
          localStorage.setItem('programApplications', JSON.stringify(applications));
        }
      }

      if (feedbackBox) {
        feedbackBox.innerHTML = `<div><h3>Ön Değerlendirme Cevaplarınız Başarıyla Gönderildi!</h3><p>Cevaplarınız Değerlendirme Kurulu masasına iletildi. Takip paneline yönlendiriliyorsunuz...</p></div>`;
        feedbackBox.removeAttribute('hidden');
        feedbackBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      submitBtn.disabled = true;

      setTimeout(() => {
        window.location.href = 'panel.html';
      }, 1500);
    });
  }
});
