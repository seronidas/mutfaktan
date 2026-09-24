document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');
  const targetDesc = document.getElementById('target-account-desc');

  if (emailParam && targetDesc) {
    targetDesc.innerHTML = `<strong>${emailParam}</strong> hesabı için güçlü ve yeni bir şifre belirleyin.`;
  }

  const form = document.getElementById('password-change-form');
  const inpNew = document.getElementById('inp-newpass');
  const inpConfirm = document.getElementById('inp-confirmpass');
  const fieldNew = document.getElementById('f-newpass');
  const fieldConfirm = document.getElementById('f-confirmpass');
  const errNew = document.getElementById('err-newpass');
  const errConfirm = document.getElementById('err-confirmpass');
  const strengthBar = document.getElementById('strength-bar');
  const strengthLabel = document.getElementById('strength-label');
  const successCard = document.getElementById('change-success-card');

  const toggleNew = document.getElementById('toggle-newpass');
  const toggleConfirm = document.getElementById('toggle-confirmpass');

  function setupToggle(button, input) {
    if (!button || !input) return;
    button.addEventListener('click', () => {
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      button.setAttribute('aria-label', isPass ? 'Şifreyi Gizle' : 'Şifreyi Göster');
      button.innerHTML = isPass
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    });
  }

  setupToggle(toggleNew, inpNew);
  setupToggle(toggleConfirm, inpConfirm);

  function checkStrength(pass) {
    if (!strengthBar || !strengthLabel) return;
    strengthBar.className = 'strength-fill';

    if (pass.length === 0) {
      strengthLabel.textContent = 'Belirtilmedi';
      return;
    }

    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (pass.length < 8 || score <= 1) {
      strengthBar.classList.add('weak');
      strengthLabel.textContent = 'Zayıf';
    } else if (score === 2 || score === 3) {
      strengthBar.classList.add('medium');
      strengthLabel.textContent = 'Orta';
    } else {
      strengthBar.classList.add('strong');
      strengthLabel.textContent = 'Güçlü';
    }
  }

  if (inpNew) {
    inpNew.addEventListener('input', () => {
      checkStrength(inpNew.value);
      if (fieldNew.classList.contains('invalid') && inpNew.value.length >= 8) {
        fieldNew.classList.remove('invalid');
      }
    });
  }

  if (inpConfirm) {
    inpConfirm.addEventListener('input', () => {
      if (fieldConfirm.classList.contains('invalid') && inpConfirm.value === inpNew.value) {
        fieldConfirm.classList.remove('invalid');
      }
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      let isValid = true;
      fieldNew.classList.remove('invalid');
      fieldConfirm.classList.remove('invalid');

      const p1 = inpNew.value;
      const p2 = inpConfirm.value;

      if (p1.length < 8) {
        fieldNew.classList.add('invalid');
        errNew.textContent = 'Şifreniz en az 8 karakter uzunluğunda olmalıdır.';
        isValid = false;
      }

      if (p1 !== p2) {
        fieldConfirm.classList.add('invalid');
        errConfirm.textContent = 'Şifreler birbiriyle eşleşmiyor.';
        isValid = false;
      }

      if (!isValid) return;

      form.classList.add('hidden');
      if (successCard) {
        successCard.classList.add('active');
      }
    });
  }
});
