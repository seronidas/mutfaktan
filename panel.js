document.addEventListener('DOMContentLoaded', () => {
  const modalEdit = document.getElementById('modal-edit-confirm');
  const btnOpenEdit = document.getElementById('btn-open-edit');
  const btnConfirmEdit = document.getElementById('btn-confirm-edit');
  const closeButtons = document.querySelectorAll('[data-close="modal-edit-confirm"]');
  const btnPrint = document.getElementById('btn-print');
  const btnLogout = document.getElementById('btn-logout');

  function getStoredData() {
    try {
      const app = localStorage.getItem('mutfaktan_application');
      if (app) return JSON.parse(app);
      const draft = localStorage.getItem('mutfaktan_app_draft');
      if (draft) return JSON.parse(draft);
    } catch (e) {}
    return null;
  }

  const appData = getStoredData();

  if (appData) {
    if (appData.fullname) {
      const userEl = document.getElementById('panel-username');
      const tblName = document.getElementById('tbl-name');
      if (userEl) userEl.textContent = appData.fullname;
      if (tblName) tblName.textContent = appData.fullname;
    }

    if (appData.refNo) {
      const refEl = document.getElementById('val-refno');
      if (refEl) refEl.textContent = appData.refNo;
    }

    if (appData.submittedAt) {
      const dateEl = document.getElementById('val-date');
      if (dateEl) {
        const d = new Date(appData.submittedAt);
        dateEl.textContent = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    }

    if (appData.birthdate) {
      const el = document.getElementById('tbl-birth');
      if (el) el.textContent = appData.birthdate;
    }

    if (appData.phone) {
      const el = document.getElementById('tbl-phone');
      if (el) el.textContent = appData.phone;
    }

    if (appData.email) {
      const el = document.getElementById('tbl-email');
      if (el) el.textContent = appData.email;
    }

    if (appData.city) {
      const el = document.getElementById('tbl-city');
      if (el) el.textContent = appData.city;
    }

    if (appData.bizname) {
      const el = document.getElementById('tbl-bizname');
      if (el) el.textContent = appData.bizname;
    }

    if (appData.biztype) {
      const el = document.getElementById('tbl-biztype');
      if (el) {
        const typeMap = {
          sahis: 'Şahıs İşletmesi',
          sirket: 'Şirket (Ltd. / A.Ş.)',
          kooperatif: 'Kadın Kooperatifi'
        };
        el.textContent = typeMap[appData.biztype] || appData.biztype;
      }
    }

    if (appData.taxno) {
      const el = document.getElementById('tbl-taxno');
      if (el) el.textContent = appData.taxno;
    }

    if (appData.bizyear) {
      const el = document.getElementById('tbl-bizyear');
      if (el) el.textContent = appData.bizyear;
    }

    if (appData.address) {
      const el = document.getElementById('tbl-address');
      if (el) el.textContent = appData.address;
    }

    if (appData.fileName) {
      const el = document.getElementById('tbl-msa');
      if (el) el.textContent = `${appData.fileName} (Doğrulandı)`;
    }

    if (appData.q11) {
      const el = document.getElementById('tbl-q11');
      if (el) el.textContent = `${appData.q11} Kişi`;
    }

    if (appData.q12) {
      const el = document.getElementById('tbl-q12');
      if (el) {
        const total = parseInt(appData.q11, 10);
        const female = parseInt(appData.q12, 10);
        let ratio = '';
        if (total > 0 && !isNaN(female)) {
          ratio = ` (%${Math.round((female / total) * 100)})`;
        }
        el.textContent = `${appData.q12} Kişi${ratio}`;
      }
    }

    if (appData.q13) {
      const el = document.getElementById('tbl-q13');
      if (el) el.textContent = `${appData.q13} Kişi`;
    }

    if (appData.q14) {
      const el = document.getElementById('tbl-q14');
      if (el) {
        const map14 = {
          '100': 'Tamamı Devam Ediyor (%100)',
          '70': 'Çoğunluğu Devam Ediyor (%70-99)',
          '50': 'Yarısı Devam Ediyor (%50-69)',
          'less': 'Yarısından Azı Devam Ediyor'
        };
        el.textContent = map14[appData.q14] || appData.q14;
      }
    }

    if (appData.q15) {
      const el = document.getElementById('tbl-q15');
      if (el) el.textContent = appData.q15 === 'no' ? 'Hayır' : 'Evet';
    }

    if (appData.q21) {
      const el = document.getElementById('tbl-q21');
      if (el) el.textContent = appData.q21 === 'no' ? 'Hayır' : 'Evet';
    }
  }

  document.querySelectorAll('.acc-head').forEach(header => {
    header.addEventListener('click', () => {
      const card = header.closest('.acc-card');
      if (card) card.classList.toggle('open');
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
      window.location.href = 'giris.html';
    });
  }

  function openModal() {
    if (modalEdit) {
      modalEdit.classList.add('active');
      document.body.classList.add('no-scroll');
    }
  }

  function closeModal() {
    if (modalEdit) {
      modalEdit.classList.remove('active');
      document.body.classList.remove('no-scroll');
    }
  }

  if (btnOpenEdit) {
    btnOpenEdit.addEventListener('click', openModal);
  }

  closeButtons.forEach(btn => {
    btn.addEventListener('click', closeModal);
  });

  if (modalEdit) {
    modalEdit.addEventListener('click', (e) => {
      if (e.target === modalEdit) {
        closeModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });

    if (btnConfirmEdit) {
    btnConfirmEdit.addEventListener('click', () => {
      const current = getStoredData() || {};
      current.status = 'draft';
      current.updatedAt = new Date().toISOString();
      localStorage.setItem('mutfaktan_app_draft', JSON.stringify(current));
      localStorage.setItem('mutfaktan_application', JSON.stringify(current));
      window.location.href = 'basvuru.html?mode=edit';
    });
  }

  const preAnswers = localStorage.getItem('onDegerlendirmeAnswers');
  if (preAnswers) {
    const bannerTitle = document.getElementById('preeval-banner-title');
    const bannerDesc = document.getElementById('preeval-banner-desc');
    const btnText = document.getElementById('btn-preeval-text');
    const btnLink = document.getElementById('btn-preeval-link');
    if (bannerTitle) bannerTitle.textContent = 'Ön Değerlendirme Yanıtlarınız Alındı';
    if (bannerDesc) bannerDesc.textContent = '6 soruluk ön değerlendirme yanıtlarınız başarıyla sisteme kaydedilmiştir. Değerlendirme Kurulu incelemesi sürmektedir.';
    if (btnText) btnText.textContent = 'Cevaplarımı İncele';
    if (btnLink) btnLink.setAttribute('href', 'on-degerlendirme-formu.html?mode=view');
  }
});
