document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('reset-request-form');
  const inpEmail = document.getElementById('inp-email');
  const fieldEmail = document.getElementById('f-email');
  const successCard = document.getElementById('success-card');
  const sentDisplay = document.getElementById('sent-email-display');
  const simLink = document.getElementById('btn-open-change-link');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const emailVal = inpEmail.value.trim();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      fieldEmail.classList.remove('invalid');

      if (!emailPattern.test(emailVal)) {
        fieldEmail.classList.add('invalid');
        inpEmail.focus();
        return;
      }

      const token = 'tok_' + Math.random().toString(36).substring(2, 10);

      if (sentDisplay) {
        sentDisplay.textContent = emailVal;
      }

      if (simLink) {
        simLink.href = `sifre-yenile.html?email=${encodeURIComponent(emailVal)}&token=${token}`;
      }

      form.classList.add('hidden');
      if (successCard) {
        successCard.classList.add('active');
      }
    });
  }
});
