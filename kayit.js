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
  const chkSartlar = document.getElementById('chk-sartlar');
  const errSartlar = document.getElementById('err-sartlar');
  const chkYonerge = document.getElementById('chk-yonerge');
  const errYonerge = document.getElementById('err-yonerge');
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

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.getAttribute('data-close'));
      if (target) MYUI.closeModal(target);
    });
  });

  openKvkk.addEventListener('click', (e) => {
    e.preventDefault();
    MYUI.openModal(modalKvkk);
  });

  openConsent.addEventListener('click', (e) => {
    e.preventDefault();
    MYUI.openModal(modalConsent);
  });

  acceptKvkk.addEventListener('click', () => {
    chkKvkk.checked = true;
    errKvkk.classList.remove('show');
    MYUI.closeModal(modalKvkk);
  });

  acceptConsent.addEventListener('click', () => {
    chkConsent.checked = true;
    errConsent.classList.remove('show');
    MYUI.closeModal(modalConsent);
  });

  MYUI.bindPasswordToggle(toggleBtn, passInput);

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
      const { score, label } = MYUI.passwordStrength(val);
      strengthBox.dataset.score = score;
      strengthTxt.textContent = label;
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

  chkSartlar.addEventListener('change', () => {
    if (chkSartlar.checked) errSartlar.classList.remove('show');
  });

  chkYonerge.addEventListener('change', () => {
    if (chkYonerge.checked) errYonerge.classList.remove('show');
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

    const isSartlarValid = chkSartlar.checked;
    const isYonergeValid = chkYonerge.checked;
    errSartlar.classList.toggle('show', !isSartlarValid);
    errYonerge.classList.toggle('show', !isYonergeValid);

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
    if (!isSartlarValid) {
      chkSartlar.focus();
      return;
    }
    if (!isYonergeValid) {
      chkYonerge.focus();
      return;
    }

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    setTimeout(() => {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      MYUI.openModal(modalSuccess);
    }, 700);
  });

  proceedBtn.addEventListener('click', () => {
    MYUI.closeModal(modalSuccess);
    const email = userInput.value.trim();
    MYUI.writeJSON('currentUser', { email, role: 'applicant' });
    window.location.href = 'basvuru.html';
  });
});
