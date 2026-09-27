// Editör sayfalarının ve ön değerlendirme formunun ortak kullandığı başvuru deposu (localStorage: programApplications).
// ui.js (MYUI) bu dosyadan önce yüklenmelidir.
(function (root) {
  var KEY = 'programApplications';

  var STRUCTURE_LABELS = {
    sahis: 'Şahıs İşletmesi',
    sirket: 'Şirket',
    kooperatif: 'Kadın Kooperatifi'
  };

  function seedApplications() {
    return [
      {
        ref: 'MY26-0042',
        name: 'Gülşah Güven',
        business: 'Gül Kadın Kooperatifi',
        structure: 'Kadın Kooperatifi',
        biztype: 'kooperatif',
        city: 'Hatay',
        totalEmployees: 6,
        femaleRatio: 100,
        sistemScore: 66,
        preScore: 26,
        totalScore: 92,
        status: 'scored',
        statusText: 'Puanlandı (92 Puan)'
      },
      {
        ref: 'MY26-0089',
        name: 'Zeynep Doğan',
        business: 'Zeynep Atölye Kafe',
        structure: 'Şahıs İşletmesi',
        biztype: 'sahis',
        city: 'İzmir',
        totalEmployees: 3,
        femaleRatio: 100,
        sistemScore: 58,
        preScore: 24,
        totalScore: 82,
        status: 'scored',
        statusText: 'Puanlandı (82 Puan)'
      },
      {
        ref: 'MY26-0115',
        name: 'Hatice Arslan',
        business: 'Arslan Yöresel Mutfak Ltd.',
        structure: 'Şirket',
        biztype: 'sirket',
        city: 'Gaziantep',
        totalEmployees: 20,
        femaleRatio: 75,
        sistemScore: 54,
        preScore: null,
        totalScore: null,
        status: 'pending-score',
        statusText: 'Ön Değerlendirme Bekliyor'
      },
      {
        ref: 'MY26-0158',
        name: 'Ayşe Yılmaz',
        business: 'Ayşe Hanım El Böreği',
        structure: 'Şahıs İşletmesi',
        biztype: 'sahis',
        city: 'Balıkesir',
        totalEmployees: 2,
        femaleRatio: 100,
        sistemScore: 52.5,
        preScore: null,
        totalScore: null,
        status: 'pending-score',
        statusText: 'Ön Değerlendirme Bekliyor'
      },
      {
        ref: 'MY26-0204',
        name: 'Fatma Çelik',
        business: 'Çelik Gastronomi A.Ş.',
        structure: 'Şirket',
        biztype: 'sirket',
        city: 'Adana',
        totalEmployees: 12,
        femaleRatio: 25,
        sistemScore: 32,
        preScore: null,
        totalScore: null,
        status: 'pending-verify',
        statusText: 'Belge Doğrulama Bekliyor'
      },
      {
        ref: 'MY26-0241',
        name: 'Emine Demir',
        business: 'Demir Karadeniz Lokantası',
        structure: 'Şahıs İşletmesi',
        biztype: 'sahis',
        city: 'Trabzon',
        totalEmployees: 8,
        femaleRatio: 25,
        sistemScore: 24,
        preScore: null,
        totalScore: null,
        status: 'pending-verify',
        statusText: 'Belge Doğrulama Bekliyor'
      }
    ];
  }

  function saveApplications(list) {
    root.MYUI.writeJSON(KEY, list);
  }

  // Depo yoksa (veya bozuksa) tohum veriyle bir kez oluşturulur; her sayfa aynı depoyu görür.
  function getApplications() {
    var list = root.MYUI.readJSON(KEY, null);
    if (!Array.isArray(list)) {
      list = seedApplications();
      saveApplications(list);
    }
    return list;
  }

  // Kayıtta biztype yoksa yapı etiketinden türetir (eski kayıtlar için).
  function bizTypeOf(app) {
    if (!app) return null;
    if (app.biztype) return app.biztype;
    var keys = Object.keys(STRUCTURE_LABELS);
    for (var i = 0; i < keys.length; i++) {
      if (STRUCTURE_LABELS[keys[i]] === app.structure) return keys[i];
    }
    return null;
  }

  root.MYDemo = {
    seedApplications: seedApplications,
    getApplications: getApplications,
    saveApplications: saveApplications,
    bizTypeOf: bizTypeOf,
    structureLabel: function (biztype) { return STRUCTURE_LABELS[biztype] || ''; }
  };
})(window);
