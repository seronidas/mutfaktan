document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('inp-search');
  const filterPills = document.querySelectorAll('.filter-pill');
  const faqCards = document.querySelectorAll('.faq-card');
  const countTotal = document.getElementById('count-total');
  const filterLabel = document.getElementById('filter-label');
  const noResults = document.getElementById('no-results');

  let activeCategory = 'all';
  let searchQuery = '';

  const catLabels = {
    all: 'Tüm Kategoriler',
    uygunluk: 'Uygunluk & Başvuru',
    msa: 'MSA Eğitimi & Sertifika',
    puanlama: 'Puanlama & Jüri',
    hibe: 'Hibe & Destekler'
  };

  function filterCards() {
    let visibleCount = 0;

    faqCards.forEach(card => {
      const cardCat = card.getAttribute('data-cat');
      const text = card.textContent.toLowerCase();

      const matchesCat = activeCategory === 'all' || cardCat === activeCategory;
      const matchesSearch = !searchQuery || text.includes(searchQuery);

      if (matchesCat && matchesSearch) {
        card.classList.remove('hidden');
        visibleCount++;
      } else {
        card.classList.add('hidden');
      }
    });

    if (countTotal) countTotal.textContent = visibleCount;
    if (filterLabel) filterLabel.textContent = catLabels[activeCategory] || 'Kategori';

    if (noResults) {
      if (visibleCount === 0) {
        noResults.classList.add('active');
      } else {
        noResults.classList.remove('active');
      }
    }
  }

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.getAttribute('data-cat') || 'all';
      filterCards();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      filterCards();
    });
  }

  faqCards.forEach(card => {
    const question = card.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        card.classList.toggle('open');
      });
    }
  });

  filterCards();
});
