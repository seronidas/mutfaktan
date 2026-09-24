document.addEventListener('DOMContentLoaded', () => {
  let currentStep = 1;
  const totalSteps = 6;

  const urlParams = new URLSearchParams(window.location.search);
  const isEditMode = urlParams.get('mode') === 'edit';
  const editBanner = document.getElementById('edit-banner');
  if (isEditMode && editBanner) editBanner.classList.add('active');

  const stepPanes = document.querySelectorAll('.step-pane');
  const stepItems = document.querySelectorAll('.step-item');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');

  const fileInput = document.getElementById('inp-file');
  const dropzone = document.getElementById('dropzone');
  const filePreview = document.getElementById('file-preview');
  const fileName = document.getElementById('file-name');
  const btnRemoveFile = document.getElementById('btn-remove-file');
  const fileError = document.getElementById('file-error');

  let uploadedFile = null;

  function loadDraft() {
    const saved = localStorage.getItem('mutfaktan_app_draft') || localStorage.getItem('mutfaktan_application');
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (data.eligibility) {
        data.eligibility.forEach((val, i) => {
          const chk = document.getElementById(`chk-el-${i + 1}`);
          if (chk) chk.checked = val;
        });
      }

      if (data.fullname) {
        document.getElementById('inp-fullname').value = data.fullname;
        const userDisp = document.getElementById('user-display');
        if (userDisp) userDisp.textContent = data.fullname;
      }
      if (data.birthdate) document.getElementById('inp-birthdate').value = data.birthdate;
      if (data.phone) document.getElementById('inp-phone').value = data.phone;
      if (data.email) document.getElementById('inp-email').value = data.email;
      if (data.city) document.getElementById('inp-city').value = data.city;

      if (data.biztype) {
        const rad = document.querySelector(`input[name="biz-type"][value="${data.biztype}"]`);
        if (rad) rad.checked = true;
      }
      if (data.bizname) document.getElementById('inp-bizname').value = data.bizname;
      if (data.taxno) document.getElementById('inp-taxno').value = data.taxno;
      if (data.bizyear) document.getElementById('inp-bizyear').value = data.bizyear;
      if (data.instagram) document.getElementById('inp-instagram').value = data.instagram;
      if (data.address) document.getElementById('inp-address').value = data.address;

      if (data.fileName) {
        uploadedFile = { name: data.fileName };
        fileName.textContent = data.fileName;
        filePreview.classList.add('active');
        dropzone.classList.add('hidden');
      }

      if (data.q11) document.getElementById('inp-q11').value = data.q11;
      if (data.q12) document.getElementById('inp-q12').value = data.q12;
      if (data.q13) document.getElementById('inp-q13').value = data.q13;
      if (data.q14) document.getElementById('inp-q14').value = data.q14;
      if (data.q15) {
        const rad = document.querySelector(`input[name="q15"][value="${data.q15}"]`);
        if (rad) rad.checked = true;
      }
      if (data.q21) {
        const rad = document.querySelector(`input[name="q21"][value="${data.q21}"]`);
        if (rad) rad.checked = true;
      }
      if (data.q22 && Array.isArray(data.q22)) {
        data.q22.forEach(val => {
          const chk = document.querySelector(`input[name="q22"][value="${val}"]`);
          if (chk) {
            chk.checked = true;
            chk.closest('.checkbox-choice').classList.add('checked');
          }
        });
      }
    } catch (e) {}
  }

  function saveDraft() {
    const data = {
      eligibility: Array.from(document.querySelectorAll('input[name="eligibility"]')).map(c => c.checked),
      fullname: document.getElementById('inp-fullname').value.trim(),
      birthdate: document.getElementById('inp-birthdate').value,
      phone: document.getElementById('inp-phone').value.trim(),
      email: document.getElementById('inp-email').value.trim(),
      city: document.getElementById('inp-city').value.trim(),
      biztype: (document.querySelector('input[name="biz-type"]:checked') || {}).value || 'sahis',
      bizname: document.getElementById('inp-bizname').value.trim(),
      taxno: document.getElementById('inp-taxno').value.trim(),
      bizyear: document.getElementById('inp-bizyear').value.trim(),
      instagram: document.getElementById('inp-instagram').value.trim(),
      address: document.getElementById('inp-address').value.trim(),
      fileName: uploadedFile ? uploadedFile.name : null,
      q11: document.getElementById('inp-q11').value,
      q12: document.getElementById('inp-q12').value,
      q13: document.getElementById('inp-q13').value,
      q14: document.getElementById('inp-q14').value,
      q15: (document.querySelector('input[name="q15"]:checked') || {}).value || 'yes',
      q21: (document.querySelector('input[name="q21"]:checked') || {}).value || 'yes',
      q22: Array.from(document.querySelectorAll('input[name="q22"]:checked')).map(c => c.value),
      status: 'draft',
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('mutfaktan_app_draft', JSON.stringify(data));
  }

  function updateStepsUI() {
    stepPanes.forEach(pane => pane.classList.remove('active'));
    const activePane = document.getElementById(`step-${currentStep}`);
    if (activePane) activePane.classList.add('active');

    stepItems.forEach(item => {
      const step = parseInt(item.getAttribute('data-step'), 10);
      item.classList.remove('active', 'completed');
      if (step === currentStep) {
        item.classList.add('active');
      } else if (step < currentStep) {
        item.classList.add('completed');
      }
    });

    const locationEl = document.getElementById('location');
    if (locationEl) locationEl.textContent = `Adım ${currentStep} / ${totalSteps}`;
    const pctEl = document.getElementById('progress-pct');
    const fillEl = document.getElementById('progressbar-fill');
    const pct = Math.round((currentStep / totalSteps) * 100);
    if (pctEl) pctEl.textContent = `%${pct}`;
    if (fillEl) fillEl.style.width = `${pct}%`;

    if (currentStep === 1) {
      btnPrev.classList.add('hidden');
    } else {
      btnPrev.classList.remove('hidden');
    }

    if (currentStep === totalSteps) {
      btnNext.innerHTML = `<span>Başvuruyu Tamamla ve Gönder</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>`;
      populateSummary();
    } else {
      btnNext.innerHTML = `<span>Devam Et</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>`;
    }

    if (currentStep > 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function validateStep1() {
    const checkboxes = document.querySelectorAll('input[name="eligibility"]');
    const allChecked = Array.from(checkboxes).every(c => c.checked);
    const gateErr = document.getElementById('gate-error');
    if (!allChecked) {
      gateErr.classList.add('show');
      return false;
    }
    gateErr.classList.remove('show');
    return true;
  }

  function validateStep2() {
    let valid = true;
    const name = document.getElementById('inp-fullname');
    const birth = document.getElementById('inp-birthdate');
    const phone = document.getElementById('inp-phone');
    const email = document.getElementById('inp-email');
    const city = document.getElementById('inp-city');

    [name, birth, phone, email, city].forEach(inp => {
      const f = inp.closest('.field');
      f.classList.remove('invalid');
    });

    if (!name.value.trim()) {
      name.closest('.field').classList.add('invalid');
      valid = false;
    }

    if (!birth.value) {
      birth.closest('.field').classList.add('invalid');
      valid = false;
    } else {
      const bDate = new Date(birth.value);
      const today = new Date();
      const end2026 = new Date('2026-12-31');
      let ageNow = today.getFullYear() - bDate.getFullYear();
      let age2026 = end2026.getFullYear() - bDate.getFullYear();
      if (ageNow < 18 || age2026 > 30) {
        birth.closest('.field').classList.add('invalid');
        valid = false;
      }
    }

    if (!phone.value.trim() || phone.value.trim().length < 10) {
      phone.closest('.field').classList.add('invalid');
      valid = false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.value.trim())) {
      email.closest('.field').classList.add('invalid');
      valid = false;
    }

    if (!city.value.trim()) {
      city.closest('.field').classList.add('invalid');
      valid = false;
    }

    return valid;
  }

  function validateStep3() {
    let valid = true;
    const bizname = document.getElementById('inp-bizname');
    const taxno = document.getElementById('inp-taxno');
    const bizyear = document.getElementById('inp-bizyear');
    const address = document.getElementById('inp-address');

    [bizname, taxno, bizyear, address].forEach(inp => {
      inp.closest('.field').classList.remove('invalid');
    });

    if (!bizname.value.trim()) {
      bizname.closest('.field').classList.add('invalid');
      valid = false;
    }

    const taxVal = taxno.value.trim();
    if (taxVal.length < 10 || taxVal.length > 11 || !/^\d+$/.test(taxVal)) {
      taxno.closest('.field').classList.add('invalid');
      valid = false;
    }

    const yearVal = parseInt(bizyear.value, 10);
    if (!yearVal || yearVal > 2024 || yearVal < 1950) {
      bizyear.closest('.field').classList.add('invalid');
      valid = false;
    }

    if (!address.value.trim()) {
      address.closest('.field').classList.add('invalid');
      valid = false;
    }

    return valid;
  }

  function validateStep4() {
    if (!uploadedFile) {
      fileError.classList.add('show');
      return false;
    }
    fileError.classList.remove('show');
    return true;
  }

  function validateStep5() {
    let valid = true;
    const q11 = document.getElementById('inp-q11');
    const q12 = document.getElementById('inp-q12');
    const q13 = document.getElementById('inp-q13');
    const q14 = document.getElementById('inp-q14');
    const q22Checks = document.querySelectorAll('input[name="q22"]:checked');
    const q22Err = document.getElementById('q22-error');

    [q11, q12, q13, q14].forEach(inp => inp.closest('.field').classList.remove('invalid'));

    const val11 = parseInt(q11.value, 10);
    if (isNaN(val11) || val11 < 2) {
      q11.closest('.field').classList.add('invalid');
      valid = false;
    }

    const val12 = parseInt(q12.value, 10);
    if (isNaN(val12) || val12 < 0 || val12 > val11) {
      q12.closest('.field').classList.add('invalid');
      valid = false;
    }

    const val13 = parseInt(q13.value, 10);
    if (isNaN(val13) || val13 < 0) {
      q13.closest('.field').classList.add('invalid');
      valid = false;
    }

    if (!q14.value) {
      q14.closest('.field').classList.add('invalid');
      valid = false;
    }

    if (q22Checks.length !== 2) {
      q22Err.classList.add('show');
      valid = false;
    } else {
      q22Err.classList.remove('show');
    }

    return valid;
  }

  function validateStep6() {
    const c1 = document.getElementById('chk-doc-1').checked;
    const c2 = document.getElementById('chk-doc-2').checked;
    const c3 = document.getElementById('chk-doc-3').checked;
    const err = document.getElementById('final-error');
    if (!c1 || !c2 || !c3) {
      err.classList.add('show');
      return false;
    }
    err.classList.remove('show');
    return true;
  }

  function populateSummary() {
    document.getElementById('sum-name').textContent = document.getElementById('inp-fullname').value || '-';
    document.getElementById('sum-birth').textContent = document.getElementById('inp-birthdate').value || '-';
    document.getElementById('sum-phone').textContent = document.getElementById('inp-phone').value || '-';
    document.getElementById('sum-email').textContent = document.getElementById('inp-email').value || '-';
    document.getElementById('sum-city').textContent = document.getElementById('inp-city').value || '-';

    document.getElementById('sum-bizname').textContent = document.getElementById('inp-bizname').value || '-';
    const biztypeEl = document.querySelector('input[name="biz-type"]:checked');
    const bizTypes = { sahis: 'Şahıs İşletmesi', sirket: 'Şirket (Ltd. / A.Ş.)', kooperatif: 'Kadın Kooperatifi' };
    document.getElementById('sum-biztype').textContent = biztypeEl ? bizTypes[biztypeEl.value] : '-';
    document.getElementById('sum-taxno').textContent = document.getElementById('inp-taxno').value || '-';
    document.getElementById('sum-bizyear').textContent = document.getElementById('inp-bizyear').value || '-';
    document.getElementById('sum-address').textContent = document.getElementById('inp-address').value || '-';

    document.getElementById('sum-msa').textContent = uploadedFile ? uploadedFile.name : 'Yüklendi';
    document.getElementById('sum-emp-total').textContent = document.getElementById('inp-q11').value || '-';
    document.getElementById('sum-emp-female').textContent = document.getElementById('inp-q12').value || '-';
    document.getElementById('sum-emp-prev').textContent = document.getElementById('inp-q13').value || '-';

    const q14Select = document.getElementById('inp-q14');
    document.getElementById('sum-emp-stay').textContent = q14Select.options[q14Select.selectedIndex].text || '-';
  }

  btnNext.addEventListener('click', () => {
    let isValid = false;
    if (currentStep === 1) isValid = validateStep1();
    else if (currentStep === 2) isValid = validateStep2();
    else if (currentStep === 3) isValid = validateStep3();
    else if (currentStep === 4) isValid = validateStep4();
    else if (currentStep === 5) isValid = validateStep5();
    else if (currentStep === 6) isValid = validateStep6();

    if (!isValid) return;

    saveDraft();

    if (currentStep === totalSteps) {
      const finalData = JSON.parse(localStorage.getItem('mutfaktan_app_draft') || '{}');
      finalData.status = 'submitted';
      finalData.submittedAt = new Date().toISOString();
      if (!finalData.refNo) {
        finalData.refNo = 'MY-2026-' + Math.floor(10000 + Math.random() * 90000);
      }
      localStorage.setItem('mutfaktan_application', JSON.stringify(finalData));
      window.location.href = 'panel.html';
      return;
    }

    currentStep++;
    updateStepsUI();
  });

  btnPrev.addEventListener('click', () => {
    if (currentStep > 1) {
      saveDraft();
      currentStep--;
      updateStepsUI();
    }
  });

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadedFile = e.target.files[0];
      fileName.textContent = uploadedFile.name;
      filePreview.classList.add('active');
      fileError.classList.remove('show');
    }
  });

  btnRemoveFile.addEventListener('click', () => {
    uploadedFile = null;
    fileInput.value = '';
    filePreview.classList.remove('active');
  });

  const hiredRadios = document.querySelectorAll('input[name="q14_hired"]');
  const detailField = document.getElementById('field-q14-detail');
  const q14Select = document.getElementById('inp-q14');
  hiredRadios.forEach(r => {
    r.addEventListener('change', () => {
      if (r.value === 'yes') {
        if (detailField) detailField.removeAttribute('hidden');
        if (q14Select) q14Select.value = 'all';
      } else {
        if (detailField) detailField.setAttribute('hidden', '');
        if (q14Select) q14Select.value = 'none';
      }
    });
  });

  const q22Inputs = document.querySelectorAll('input[name="q22"]');
  const q22CounterLabel = document.getElementById('q22-counter-label');
  const q22Err = document.getElementById('q22-error');

  q22Inputs.forEach(chk => {
    chk.addEventListener('change', (e) => {
      const parent = e.target.closest('.checkbox-choice');
      if (e.target.checked) parent.classList.add('checked');
      else parent.classList.remove('checked');

      const checkedBoxes = document.querySelectorAll('input[name="q22"]:checked');
      const checkedCount = checkedBoxes.length;

      if (q22CounterLabel) {
        q22CounterLabel.textContent = `(Tam 2 seçim yapınız — Seçilen: ${checkedCount} / 2)`;
      }

      if (checkedCount >= 2) {
        q22Inputs.forEach(input => {
          if (!input.checked) {
            input.disabled = true;
          }
        });
      } else {
        q22Inputs.forEach(input => {
          input.disabled = false;
        });
      }

      if (checkedCount !== 2) {
        q22Err.classList.add('show');
      } else {
        q22Err.classList.remove('show');
      }
    });
  });

  document.querySelectorAll('.accordion-header').forEach(hdr => {
    hdr.addEventListener('click', () => {
      const item = hdr.closest('.accordion-item');
      item.classList.toggle('open');
    });
  });

  loadDraft();
  updateStepsUI();
});
