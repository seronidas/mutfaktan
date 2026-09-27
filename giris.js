document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const userInput = document.getElementById('username');
  const passInput = document.getElementById('password');
  const toggleBtn = document.getElementById('toggle-pw');
  const submitBtn = document.getElementById('btn-submit');

  const fieldUser = userInput.closest('.field');
  const fieldPass = passInput.closest('.field');


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
      errEl.textContent = 'Lütfen kullanıcı adı veya e-posta giriniz.';
      return false;
    }
    fieldUser.classList.remove('invalid');
    return true;
  }

  function validatePassword() {
    const val = passInput.value;
    const errEl = fieldPass.querySelector('.error');
    if (!val) {
      fieldPass.classList.add('invalid');
      errEl.textContent = 'Lütfen şifrenizi giriniz.';
      return false;
    }
    fieldPass.classList.remove('invalid');
    return true;
  }

  userInput.addEventListener('input', () => {
    if (userInput.value.trim().length > 0) fieldUser.classList.remove('invalid');
  });

  passInput.addEventListener('input', () => {
    if (passInput.value.length > 0) fieldPass.classList.remove('invalid');
  });

  userInput.addEventListener('blur', validateUser);
  passInput.addEventListener('blur', validatePassword);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const isUserValid = validateUser();
    const isPassValid = validatePassword();

    if (!isUserValid) {
      userInput.focus();
      return;
    }
    if (!isPassValid) {
      passInput.focus();
      return;
    }

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    setTimeout(() => {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      const userVal = userInput.value.trim().toLowerCase();
      const storedEditor = MYUI.readJSON('editorUser');
      // DEMO: gerçek kimlik doğrulama arka uç gerektirir
      const isEditor = userVal.includes('editor') || (storedEditor && storedEditor.email && storedEditor.email.toLowerCase() === userVal);
      if (isEditor) {
        const editorObj = storedEditor || {
          email: userInput.value.trim(),
          name: 'Dr. Elif Kaya',
          role: 'editor'
        };
        MYUI.writeJSON('currentUser', editorObj);
        window.location.href = 'editor-panel.html';
      } else {
        const applicantObj = {
          email: userInput.value.trim(),
          role: 'applicant'
        };
        MYUI.writeJSON('currentUser', applicantObj);
        window.location.href = 'panel.html';
      }
    }, 700);
  });
});
