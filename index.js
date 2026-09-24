// index.js - Mutfaktan Yarına Ana Sayfa Etkileşim Scripti

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobil Menü Aç/Kapat
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      const isExpanded = mobileToggle.getAttribute('aria-expanded') === 'true';
      mobileToggle.setAttribute('aria-expanded', !isExpanded);
      mobileToggle.classList.toggle('active');
      navMenu.classList.toggle('mobile-open');
    });

    // Menü dışına tıklandığında kapat
    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !mobileToggle.contains(e.target) && navMenu.classList.contains('mobile-open')) {
        mobileToggle.classList.remove('active');
        mobileToggle.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('mobile-open');
      }
    });

    // Mobil menü linkine tıklandığında menüyü kapat
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileToggle.classList.remove('active');
        mobileToggle.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('mobile-open');
      });
    });
  }

  // 2. Modallar: Hibe Şartları ve Hibe Yönergesi
  window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  };

  window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  };

  // Modal dışına tıklandığında kapat
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
      }
    });
  });

  // ESC tuşu ile kapat
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.show').forEach(modal => {
        modal.classList.remove('show');
      });
      document.body.style.overflow = '';
    }
  });

  // Hibe Şartları & Yönerge butonları için modal tetikleyiciler
  const btnSartlar = document.getElementById('btn-sartlar-modal');
  if (btnSartlar) {
    btnSartlar.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('modal-sartlar');
    });
  }

  const btnYonerge = document.getElementById('btn-yonerge-modal');
  if (btnYonerge) {
    btnYonerge.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('modal-yonerge');
    });
  }

  const btnOpenYonerge = document.getElementById('btn-open-yonerge');
  if (btnOpenYonerge) {
    btnOpenYonerge.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('modal-yonerge');
    });
  }

  const navLinkSartlar = document.getElementById('nav-link-sartlar');
  if (navLinkSartlar) {
    navLinkSartlar.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('modal-sartlar');
    });
  }

  const navLinkYonerge = document.getElementById('nav-link-yonerge');
  if (navLinkYonerge) {
    navLinkYonerge.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('modal-yonerge');
    });
  }

  // 3. Scrollspy & Sekmeler Arası Gezinti (Yan Menü ve Sticky Subnav)
  const sections = ['proje-hakkinda', 'msa-egitimi', 'hibe-destegi', 'program-takvimi'];
  const subnavTabs = document.querySelectorAll('.subnav-tab');
  const sideLinks = document.querySelectorAll('.side-nav-link, .side-link');

  function getTargetId(elem) {
    if (!elem) return '';
    return elem.getAttribute('data-target') || 
           elem.getAttribute('data-section') || 
           (elem.getAttribute('href') || '').replace('#', '');
  }

  function updateActiveTabs(activeId) {
    subnavTabs.forEach(tab => {
      if (getTargetId(tab) === activeId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    sideLinks.forEach(link => {
      if (getTargetId(link) === activeId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Scroll Olayı Dinleme (Scrollspy)
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const headerEl = document.querySelector('.site-header');
        const headerH = headerEl ? headerEl.offsetHeight : 75;
        const scrollPosition = window.scrollY + headerH + 60;
        let currentSectionId = sections[0];

        for (const sectionId of sections) {
          const el = document.getElementById(sectionId);
          if (el) {
            const top = el.offsetTop;
            const height = el.offsetHeight;
            if (scrollPosition >= top && scrollPosition < top + height) {
              currentSectionId = sectionId;
              break;
            } else if (scrollPosition >= top) {
              currentSectionId = sectionId;
            }
          }
        }

        updateActiveTabs(currentSectionId);
        ticking = false;
      });
      ticking = true;
    }
  });

  // Tıklamayla Yumuşak Kaydırma (Sticky Subnav & Sol Yan Menü)
  function smoothScrollTo(targetId, e) {
    if (e) e.preventDefault();
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      const headerEl = document.querySelector('.site-header');
      const headerOffset = (headerEl ? headerEl.offsetHeight : 75) + 15;
      const elementPosition = targetEl.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      updateActiveTabs(targetId);
      if (history.pushState) {
        history.pushState(null, null, '#' + targetId);
      }
    }
  }

  subnavTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const targetId = getTargetId(tab);
      if (targetId) smoothScrollTo(targetId, e);
    });
  });

  sideLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = getTargetId(link);
      if (targetId) smoothScrollTo(targetId, e);
    });
  });
});
