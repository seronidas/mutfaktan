document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  const userInput = document.getElementById('username');
  const passInput = document.getElementById('password');
  const toggleBtn = document.getElementById('toggle-pw');
  const chkKvkk = document.getElementById('chk-kvkk');
  const chkConsent = document.getElementById('chk-consent');
  const submitBtn = document.getElementById('btn-submit');

  const fieldUser = userInput.closest('.field');
  const fieldPass = passInput.closest('.field');
  const errKvkk = document.getElementById('err-kvkk');
  const errConsent = document.getElementById('err-consent');

  const strengthBox = document.getElementById('strength-box');
  const strengthTxt = document.getElementById('strength-txt');

  const modalKvkk = document.getElementById('modal-kvkk');
  const modalConsent = document.getElementById('modal-consent');
  const modalSuccess = document.getElementById('modal-success');

  const openKvkk = document.getElementById('open-kvkk');
  const openConsent = document.getElementById('open-consent');
  const acceptKvkk = document.getElementById('accept-kvkk');
  const acceptConsent = document.getElementById('accept-consent');
  const proceedBtn = document.getElementById('proceed-grant');

  function openModal(modal) {
    modal.classList.add('active');
    document.body.classList.add('no-scroll');
  }

  function closeModal(modal) {
    modal.classList.remove('active');
    document.body.classList.remove('no-scroll');
  }

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.getAttribute('data-close'));
      if (target) closeModal(target);
    });
  });

  [modalKvkk, modalConsent, modalSuccess].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [modalKvkk, modalConsent, modalSuccess].forEach(modal => {
        if (modal.classList.contains('active')) closeModal(modal);
      });
    }
  });

  openKvkk.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(modalKvkk);
  });

  openConsent.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(modalConsent);
  });

  acceptKvkk.addEventListener('click', () => {
    chkKvkk.checked = true;
    errKvkk.classList.remove('show');
    closeModal(modalKvkk);
  });

  acceptConsent.addEventListener('click', () => {
    chkConsent.checked = true;
    errConsent.classList.remove('show');
    closeModal(modalConsent);
  });

  toggleBtn.addEventListener('click', () => {
    const isPass = passInput.type === 'password';
    passInput.type = isPass ? 'text' : 'password';
    toggleBtn.setAttribute('aria-label', isPass ? 'Şifreyi Gizle' : 'Şifreyi Göster');
    toggleBtn.innerHTML = isPass
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  });

  function validateUser() {
    const val = userInput.value.trim();
    const errEl = fieldUser.querySelector('.error');
    if (!val) {
      fieldUser.classList.add('invalid');
      errEl.textContent = 'Kullanıcı adı veya e-posta alanı boş bırakılamaz.';
      return false;
    }
    if (val.includes('@')) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(val)) {
        fieldUser.classList.add('invalid');
        errEl.textContent = 'Lütfen geçerli bir e-posta formatı giriniz (örn: ad@mutfaktan.com).';
        return false;
      }
    } else {
      if (val.length < 3) {
        fieldUser.classList.add('invalid');
        errEl.textContent = 'Kullanıcı adı en az 3 karakter olmalıdır.';
        return false;
      }
      if (!/^[a-zA-Z0-9._-]+$/.test(val)) {
        fieldUser.classList.add('invalid');
        errEl.textContent = 'Kullanıcı adı yalnızca harf, rakam, nokta, tire veya alt çizgi içerebilir.';
        return false;
      }
    }
    fieldUser.classList.remove('invalid');
    return true;
  }

  function getStrength(pwd) {
    let score = 0;
    if (!pwd) return 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  }

  const titles = ['Çok Zayıf', 'Zayıf', 'Orta', 'Çok Güçlü'];

  function validatePassword() {
    const val = passInput.value;
    const errEl = fieldPass.querySelector('.error');
    if (!val) {
      fieldPass.classList.add('invalid');
      errEl.textContent = 'Şifre alanı boş bırakılamaz.';
      return false;
    }
    if (val.length < 8) {
      fieldPass.classList.add('invalid');
      errEl.textContent = 'Şifreniz en az 8 karakter uzunluğunda olmalıdır.';
      return false;
    }
    fieldPass.classList.remove('invalid');
    return true;
  }

  passInput.addEventListener('input', () => {
    const val = passInput.value;
    if (val.length > 0) {
      strengthBox.classList.add('active');
      const score = getStrength(val);
      strengthBox.dataset.score = score;
      strengthTxt.textContent = score === 0 ? 'Çok Zayıf' : titles[score - 1];
    } else {
      strengthBox.classList.remove('active');
      strengthBox.dataset.score = '0';
    }
    if (val.length >= 8) {
      fieldPass.classList.remove('invalid');
    }
  });

  userInput.addEventListener('input', () => {
    if (userInput.value.trim().length >= 3) {
      fieldUser.classList.remove('invalid');
    }
  });

  userInput.addEventListener('blur', validateUser);
  passInput.addEventListener('blur', validatePassword);

  chkKvkk.addEventListener('change', () => {
    if (chkKvkk.checked) errKvkk.classList.remove('show');
  });

  chkConsent.addEventListener('change', () => {
    if (chkConsent.checked) errConsent.classList.remove('show');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const isUserValid = validateUser();
    const isPassValid = validatePassword();
    let isKvkkValid = true;
    let isConsentValid = true;

    if (!chkKvkk.checked) {
      errKvkk.classList.add('show');
      isKvkkValid = false;
    } else {
      errKvkk.classList.remove('show');
    }

    if (!chkConsent.checked) {
      errConsent.classList.add('show');
      isConsentValid = false;
    } else {
      errConsent.classList.remove('show');
    }

    if (!isUserValid) {
      userInput.focus();
      return;
    }
    if (!isPassValid) {
      passInput.focus();
      return;
    }
    if (!isKvkkValid) {
      chkKvkk.focus();
      return;
    }
    if (!isConsentValid) {
      chkConsent.focus();
      return;
    }

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    setTimeout(() => {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      openModal(modalSuccess);
    }, 700);
  });

  proceedBtn.addEventListener('click', () => {
    closeModal(modalSuccess);
    alert("Hibe Başvuru Formu'na aktarılıyorsunuz. Lütfen MSA Sertifikanızı yüklemeyi unutmayınız.");
  });
});
