document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');
  const emailInput = document.getElementById('editorEmail');
  const nameInput = document.getElementById('editorName');
  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirmPassword');
  const togglePwBtn = document.getElementById('togglePw');
  const pwStrengthFill = document.getElementById('pwStrengthFill');
  const pwStrengthText = document.getElementById('pwStrengthText');
  const ethicsCheck = document.getElementById('ethicsCheck');
  const openEthicsModalBtn = document.getElementById('openEthicsModal');
  const closeEthicsModalBtn = document.getElementById('closeEthicsModal');
  const confirmEthicsModalBtn = document.getElementById('confirmEthicsModal');
  const ethicsModal = document.getElementById('ethicsModal');
  const activationForm = document.getElementById('activationForm');
  const feedbackBox = document.getElementById('feedbackBox');

  if (emailParam && emailInput) {
    emailInput.value = decodeURIComponent(emailParam);
  }

  if (togglePwBtn && passwordInput) {
    togglePwBtn.addEventListener('click', () => {
      const isPass = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPass ? 'text' : 'password');
      confirmInput.setAttribute('type', isPass ? 'text' : 'password');
    });
  }

  function evaluateStrength(val) {
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    return score;
  }

  if (passwordInput && pwStrengthFill && pwStrengthText) {
    passwordInput.addEventListener('input', () => {
      const val = passwordInput.value;
      pwStrengthFill.classList.remove('weak', 'medium', 'strong');
      if (!val) {
        pwStrengthText.textContent = 'Şifre güvenliği';
        return;
      }
      const score = evaluateStrength(val);
      if (score <= 1) {
        pwStrengthFill.classList.add('weak');
        pwStrengthText.textContent = 'Zayıf şifre (En az 8 karakter, harf ve rakam)';
      } else if (score === 2 || score === 3) {
        pwStrengthFill.classList.add('medium');
        pwStrengthText.textContent = 'Orta seviye şifre';
      } else {
        pwStrengthFill.classList.add('strong');
        pwStrengthText.textContent = 'Güçlü şifre';
      }
    });
  }

  function setEthicsModal(isOpen) {
    if (ethicsModal) {
      if (isOpen) {
        ethicsModal.removeAttribute('hidden');
      } else {
        ethicsModal.setAttribute('hidden', '');
      }
    }
  }

  if (openEthicsModalBtn) {
    openEthicsModalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      setEthicsModal(true);
    });
  }

  if (closeEthicsModalBtn) {
    closeEthicsModalBtn.addEventListener('click', () => {
      setEthicsModal(false);
    });
  }

  if (confirmEthicsModalBtn) {
    confirmEthicsModalBtn.addEventListener('click', () => {
      if (ethicsCheck) {
        ethicsCheck.checked = true;
      }
      setEthicsModal(false);
    });
  }

  function showFeedback(message, isSuccess) {
    if (!feedbackBox) return;
    feedbackBox.textContent = message;
    feedbackBox.className = isSuccess ? 'feedback-banner feedback-success' : 'feedback-banner feedback-error';
    feedbackBox.removeAttribute('hidden');
  }

  if (activationForm) {
    activationForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameVal = nameInput.value.trim();
      const pwVal = passwordInput.value;
      const confirmVal = confirmInput.value;
      const isEthicsChecked = ethicsCheck.checked;

      if (!nameVal) {
        showFeedback('Lütfen adınızı ve soyadınızı giriniz.', false);
        nameInput.focus();
        return;
      }

      if (pwVal.length < 8) {
        showFeedback('Şifreniz en az 8 karakterden oluşmalıdır.', false);
        passwordInput.focus();
        return;
      }

      if (pwVal !== confirmVal) {
        showFeedback('Girdiğiniz şifreler birbiriyle uyuşmuyor.', false);
        confirmInput.focus();
        return;
      }

      if (!isEthicsChecked) {
        showFeedback('Lütfen Değerlendirici Etik İlkeleri ve Gizlilik Taahhütnamesini onaylayınız.', false);
        ethicsCheck.focus();
        return;
      }

      const editorUser = {
        email: emailInput.value.trim(),
        name: nameVal,
        role: 'editor',
        activatedAt: new Date().toISOString()
      };

      localStorage.setItem('currentUser', JSON.stringify(editorUser));
      localStorage.setItem('editorUser', JSON.stringify(editorUser));

      showFeedback('Hesabınız başarıyla aktifleştirildi! Değerlendirme paneline yönlendiriliyorsunuz...', true);

      setTimeout(() => {
        window.location.href = 'editor-panel.html';
      }, 1000);
    });
  }
});
