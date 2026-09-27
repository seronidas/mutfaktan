document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  const successState = document.getElementById('contact-success');
  const btnNewMessage = document.getElementById('btn-new-message');
  // TODO(backend): form gönderimi

  const inpName = document.getElementById('inp-cname');
  const inpEmail = document.getElementById('inp-cemail');
  const inpPhone = document.getElementById('inp-cphone');
  const selTopic = document.getElementById('sel-topic');
  const txtMessage = document.getElementById('txt-message');

  const fieldName = document.getElementById('f-name');
  const fieldEmail = document.getElementById('f-email');
  const fieldPhone = document.getElementById('f-phone');
  const fieldTopic = document.getElementById('f-topic');
  const fieldMessage = document.getElementById('f-message');

  function validate() {
    let isValid = true;

    fieldName.classList.remove('invalid');
    fieldEmail.classList.remove('invalid');
    fieldPhone.classList.remove('invalid');
    fieldTopic.classList.remove('invalid');
    fieldMessage.classList.remove('invalid');

    if (!inpName.value.trim()) {
      fieldName.classList.add('invalid');
      isValid = false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(inpEmail.value.trim())) {
      fieldEmail.classList.add('invalid');
      isValid = false;
    }

    const phoneVal = inpPhone.value.trim().replace(/\D/g, '');
    if (phoneVal.length < 10) {
      fieldPhone.classList.add('invalid');
      isValid = false;
    }

    if (!selTopic.value) {
      fieldTopic.classList.add('invalid');
      isValid = false;
    }

    if (txtMessage.value.trim().length < 10) {
      fieldMessage.classList.add('invalid');
      isValid = false;
    }

    return isValid;
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!validate()) return;

      form.reset();
      form.classList.add('hidden');
      if (successState) successState.classList.add('active');
    });
  }

  if (btnNewMessage) {
    btnNewMessage.addEventListener('click', () => {
      if (form) form.classList.remove('hidden');
      if (successState) successState.classList.remove('active');
      if (inpName) inpName.focus();
    });
  }
});
