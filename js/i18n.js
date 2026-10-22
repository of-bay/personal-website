// i18n.js - EN/TR language toggle.
// English text lives in the HTML (data-i18n="key"); Turkish lives in TR below.
// Choice order: ?lang=xx in URL > saved choice > browser language > English.

(function () {
    var STORAGE_KEY = 'site-lang';

    var TR = {
        'nav.aria': 'Ana menü',
        'nav.toggle': 'Menüyü aç/kapat',
        'nav.sub': 'Biyoinformatik · Metabolik Modelleme',
        'nav.about': 'Hakkımda',
        'nav.services': 'Danışmanlık',
        'nav.research': 'Araştırma',
        'nav.publications': 'Yayınlar',
        'nav.collaborators': 'İş Birlikleri',
        'nav.tutorials': 'Eğitimler',
        'nav.playground': 'Simülasyon',
        'pg.title': 'Metabolik <span class="gradient-text">Simülasyon</span>',
        'pg.intro': 'Sahte bir hücrede genleri kapatın ve hücrenin yine de büyüyüp büyüyemediğini görün. Bilimsel bilgi gerekmez. Doğrudan tarayıcınızda çalışır.',
        'pg.note': 'Eğitim amaçlı oyuncak model: hücrenin basitleştirilmiş bir karikatürü, gerçek bir organizma değildir.',
        'pg.genes': 'Genler (kapatmak için tıklayın)',
        'pg.env': 'Ortam',
        'pg.aerobic': 'Oksijenli',
        'pg.anaerobic': 'Oksijensiz',
        'pg.glc': 'Glikoz kaynağı',
        'pg.o2': 'Oksijen kaynağı',
        'pg.goal': 'Hedef',
        'pg.goalGrowth': 'En yüksek büyüme',
        'pg.goalLac': 'Laktat üret',
        'pg.reset': 'Sıfırla',
        'pg.flux': 'Her adım ne kadar yoğun çalışıyor?',
        'pg.screen': 'Hangi genler olmadan hücre yaşayamaz?',
        'pg.howTitle': 'Nasıl çalışır?',
        'pg.how0': 'Hücreyi minik bir mutfak gibi düşünün. Şekeri alır, bir dizi adımdan geçirerek pişirir ve elde ettiği enerji ve malzemeyle kendi kopyasını yapar. Her adımı enzim denen bir işçi yapar, her işçi de gen denen talimatlardan üretilir. Burada işçileri tek tek işten çıkarıp ne olacağına bakabilirsiniz. Bir bilgisayar, bilim insanlarının gerçek hücrelerde kullandığı türden matematikle mutfağın en iyi nasıl çalışacağını hesaplar.',
        'pg.how1': '<strong>Çevreyi seçin:</strong> oksijen var mı? Menüde ne kadar şeker var?',
        'pg.how2': '<strong>Bir işçiyi çıkarın:</strong> bir gene tıklayarak kapatın (kırmızı olur). Hücre onsuz idare edebilir mi?',
        'pg.how3': '<strong>Etkisini görün:</strong> üstteki çubuk, hücrenin sağlıklı bir hücreye göre ne kadar iyi büyüdüğünü gösterir. Alttaki çubuklar her adımın ne kadar yoğun çalıştığını gösterir.',
        'pg.glossTitle': 'Bu moleküller nedir? (günlük dille)',
        'pg.glossGenes': 'Her gen ne yapar?',
        'pg.aiTitle': 'Bu ne anlama geliyor?',
        'pg.aiNote': 'Bir yapay zeka simülasyon sonucunu okur ve sade bir dille açıklar.',
        'pg.aiBtn': 'Bu sonucu açıkla',
        'pg.mapTitle': 'Hücre haritası',
        'pg.pdf': 'PDF raporu indir',
        'pg.storiesTitle': 'Rehberli bir hikaye deneyin',
        'pg.storiesNote': 'Bir hikaye seçin. Hücreyi sizin için ayarlar ve adım adım neye bakmanız gerektiğini anlatır.',
        'nav.contact': 'İletişim',

        'hero.sub': 'Biyoinformatik · Metabolik Modelleme · Fonksiyonel Genomik',
        'hero.title': 'Hücrenin işleyişini açıklayan <span class="gradient-text">metabolik modeller</span>',
        'hero.lead': 'Hücreler besini enerjiye ve yapı taşlarına dönüştürmek için binlerce kimyasal reaksiyon yürütür. Genom ölçekli metabolik model, bir canlının DNA\'sından yola çıkarak bu reaksiyonların tamamını gösteren bir bilgisayar haritasıdır. Bir gen kapatıldığında, ilaç eklendiğinde ya da beslenme değiştiğinde ne olacağı, deney yapmadan önce ekranda denenebilir. Mikroplar, parazitler, bağırsak bakterileri ve insan hücreleri için kullanılabilir.',
        'hero.app1': 'Hastalık mekanizmaları',
        'hero.app2': 'İlaç keşfi',
        'hero.app3': 'Bağırsak mikrobiyomu',
        'hero.app4': 'Biyoteknoloji',
        'hero.app5': 'Beslenme ve diyet (planlanan)',
        'partners.label': 'Araştırma iş birlikleri ve bağlı kurumlar',
        'work.h': 'Çalışma alanları',
        'work.li1': '<strong>Metabolik modelleme:</strong> Genom ölçekli metabolik modellerin kurulması ve elle düzeltilmesi; akı dengesi analizi (FBA) gibi kısıt tabanlı yöntemlerle parazitlerden bağırsak bakterilerine kadar organizmaların davranışının öngörülmesi ve olası ilaç hedeflerinin belirlenmesi.',
        'work.li2': '<strong>Fonksiyonel genomik:</strong> Genom anotasyonlarını iyileştirmek ve gen ifadesini metabolizmayla ilişkilendirmek için bulk ve tek hücre RNA-seq analizi.',
        'work.li3': '<strong>Araçlar ve eğitim:</strong> Omik veriler için analiz iş akışları ve üniversite ile lise düzeyinde biyoinformatik eğitimi.',
        'hero.cta1': 'İletişime Geç',
        'hero.cta2': 'Yayınları Gör',

        'about.title': '<span class="gradient-text">Hakkımda</span>',
        'about.p1': 'Dr. Ömer Faruk Bay, Atatürk Üniversitesi Moleküler Biyoloji ve Genetik bölümünden mezun olmuş; yüksek lisans ve doktorasını Birleşik Krallık\'taki Manchester Üniversitesi\'nde Sistem Biyolojisi ve Biyoinformatik alanında tamamlamıştır. Doktora çalışması parazitik kırbaç kurdu <i>Trichuris muris</i>\'in metabolizmasına odaklanmış; bu parazit için ilk genom ölçekli metabolik modeli geliştirerek yeni terapötik hedeflerin ortaya çıkarılmasına katkı sağlamıştır.',
        'about.p2': 'Lars Kuepfer\'in grubunda doktora sonrası araştırmacı olarak, sentetik fare bağırsak bakteri topluluğu (OMM19) için genom ölçekli metabolik modellerin yeniden oluşturulması üzerine çalışmıştır. Bu bakterilerin metabolik yeteneklerini ve etkileşimlerini haritalayarak topluluğun ortak fenotipini ve bozulmalara karşı dayanıklılığını çözümlemiştir.',
        'about.p3': 'Halen AGÜ\'de Biyoinformatik dersleri veren bir öğretim görevlisidir; ayrıca fonksiyonel genomik, sistem biyolojisi ve metabolik modelleme alanlarındaki derin uzmanlığıyla danışmanlık yapmaktadır.',
        'skill.metabolic': 'Metabolik Modelleme',
        'skill.functional': 'Fonksiyonel Genomik',
        'skill.transcriptomics': 'Transkriptomik',
        'skill.systems': 'Sistem Biyolojisi',
        'skill.bioinformatics': 'Biyoinformatik',


        'services.title': 'Danışmanlık <span class="gradient-text">Hizmetleri</span>',
        'svc1.hc': 'Kapsam',
        'svc1.c1': 'Genomdan metabolik model kurma: taslak oluşturma, elle küratörlük ve boşluk doldurma.',
        'svc1.c2': 'Akı denge analizi gibi simülasyonlar: büyüme, temel genler ve reaksiyonlar, besin ve ilaç etkileri.',
        'svc1.c3': 'RNA-seq verisiyle ayarlanmış modeller ve birden çok türü bir arada ele alan topluluk modelleri.',
        'svc1.hu': 'Tipik uygulamalar',
        'svc1.u': 'İlaç hedefi keşfi, hastalık metabolizmasını anlama, bağırsak mikrobiyomu etkileşimleri, biyoteknoloji ve suş tasarımı, beslenme ve diyet araştırmaları.',
        'svc1.hi': 'Siz verirsiniz → siz alırsınız',
        'svc1.i': 'Bir genom ya da mevcut bir model, varsa büyüme verisi → küratörlüğü yapılmış model dosyası (SBML), simülasyon sonuçları, şekiller ve açık dokümantasyon.',
        'svc2.hc': 'Kapsam',
        'svc2.c1': 'Bulk RNA-seq: kalite kontrol, nicelendirme, diferansiyel ifade ve yolak zenginleştirme.',
        'svc2.c2': 'Tek hücre ve uzamsal transkriptomik: kümeleme, hücre tipleri ve uzamsal örüntüler.',
        'svc2.c3': 'Gen ağları ve ifade verisinin metabolik modellere bağlanması.',
        'svc2.hu': 'Tipik uygulamalar',
        'svc2.u': 'Koşullar, hastalıklı ve sağlıklı doku ya da ilaçlı ve ilaçsız örnekler arasında hangi gen ve yolakların değiştiğini bulma.',
        'svc2.hi': 'Siz verirsiniz → siz alırsınız',
        'svc2.i': 'Ham okumalar ya da sayım tablosu ve örnek bilgisi → tekrarlanabilir analiz, sonuç tabloları, şekiller ve kısa bir rapor.',
        'svc3.hc': 'Kapsam',
        'svc3.c1': 'Kendi verileriniz için Python, R ve Unix ile özel araçlar ve betikler.',
        'svc3.c2': 'Yüksek verimli biyolojik veriler için otomatik ve tekrarlanabilir iş akışları.',
        'svc3.c3': 'Analizin kurum içinde tekrarlanabilmesi için ekibinize eğitim.',
        'svc3.hu': 'Tipik uygulamalar',
        'svc3.u': 'Elle yapılan tablo işlerini ortadan kaldırma, laboratuvar analizini standartlaştırma ya da bir araştırma sorusu etrafında küçük bir araç ya da panel geliştirme.',
        'svc3.hi': 'Siz verirsiniz → siz alırsınız',
        'svc3.i': 'Veri setiniz ve cevap aradığınız soru → belgelenmiş kod, sonuçlar ve bir devir teslim oturumu.',
        'services.more': 'Ayrıntıları göster',
        'services.less': 'Ayrıntıları gizle',
        'services.cta': 'Proje görüşelim',
        'services.h1': 'Metabolik Modelleme',
        'services.p1': 'Ökaryotik ve prokaryotik sistemler için genom ölçekli metabolik ağ yeniden oluşturma, elle küratörlük ve kısıt tabanlı modelleme.',
        'services.h2': 'Fonksiyonel Genomik',
        'services.p2': 'Anlamlı biyolojik ağlar çıkarmak için bulk RNA-seq, tek hücre RNA-seq ve uzamsal transkriptomik veri analizi iş akışları.',
        'services.h3': 'Veri Analizi ve Pipeline Geliştirme',
        'services.p3': 'Projenizin ihtiyaçlarına göre özel biyoinformatik araç geliştirme ve yüksek verimli biyolojik veri analizi.',

        'research.title': 'Güncel <span class="gradient-text">Araştırma</span>',
        'research.h1': 'Cambridge ve Sanger Enstitüsü İş Birliği',
        'research.d1': '2024 – Günümüz',
        'research.p1': '<i>Trichuris muris</i> ve <i>Trichuris trichiura</i> için genom anotasyonlarını iyileştirmek ve genom ölçekli metabolik modeller oluşturmak amacıyla RNA-seq verilerini bütünleştiren uluslararası bir genomik iş birliğine liderlik etmektedir.',
        'research.h2': 'Uniklinik RWTH Aachen Projesi',
        'research.d2': 'Oca 2023 – Nis 2024',
        'research.p2': 'Sentetik fare bağırsak bakteri topluluğu (OMM19) için genom ölçekli metabolik modelleri yeniden oluşturdu ve analiz etti; metabolik etkileşimleri ve disbiyoza yol açan mekanizmaları inceledi.',

        'pubs.title': 'Önemli <span class="gradient-text">Yayınlar</span>',
        'pubs.read': 'Makaleyi Oku',
        'pubs.all': 'Tam listeyi Google Scholar\'da gör →',

        'tut.title': 'Eğitimler ve <span class="gradient-text">Bilim İletişimi</span>',
        'tut.sub': 'Üniversite Eğitimi',
        'tut.h1': 'Abdullah Gül Üniversitesi (AGÜ)',
        'tut.r1': 'Lisans ve Lisansüstü Öğretim Görevlisi',
        'tut.p1': 'Şu anda <i>Hesaplamalı Biyoloji</i> ve <i>Fonksiyonel Genomik</i> dahil çekirdek biyoinformatik müfredatını yürütmektedir. Teorik dizileri pratik veri bilimine bağlamaya odaklanır.',
        'tut.h2': 'Manchester Üniversitesi',
        'tut.r2': 'Lisansüstü Öğretim Asistanı',
        'tut.p2': 'Yüksek lisans öğrencileri için <i>Programlama Becerileri</i>, <i>Biyolojiye Hesaplamalı Yaklaşımlar</i> ve <i>Biyoinformatik Araçlar ve Kaynaklar</i> dahil uygulamalı modüller yürüttü.',

        'tub.title': 'TÜBİTAK 4004 &mdash; <span class="gradient-text">Hücre Fabrikası</span>',
        'tub.desc': 'Lise öğrencilerine yönelik biyoinformatik ve sistem biyolojisi dersleri. İnteraktif slayt sistemi ile tasarlanmıştır.',
        'tub.h1': 'Ders 1: Genden RNA\'ya',
        'tub.s1': 'Omiks Teknolojilerine Giriş',
        'tub.p1': 'DNA, Merkezi Dogma, Transkripsiyon, RNA-seq, Genomiks, Transkriptomiks ve tek hücre analizine interaktif giriş. 16 slayt.',
        'tub.h2': 'Ders 2: Hücre Fabrikası',
        'tub.s2': 'Metabolizma &amp; Modelleme',
        'tub.p2': 'Metabolizma, glikoliz, metabolik ağlar, GPS analojisi, FBA modelleme ve sentetik biyoloji simülasyonları. 15 slayt.',
        'tub.go': 'Derse Git →',

        'collab.title': 'Önemli <span class="gradient-text">İş Birlikleri</span>',
        'collab.d1': 'Wellcome Sanger Enstitüsü ve Cambridge Üniv.',
        'collab.p1': '<i>Trichuris</i> metabolik modellemesi için çoklu omik verilerin bütünleştirilmesinde yakın iş birliği yapmaktadır.',
        'collab.p2': 'OMM19 mikrobiyomunun metabolik yeteneklerinin yeniden oluşturulması ve analizi üzerinde birlikte çalıştı.',

        'contact.title': 'Birlikte <span class="gradient-text">çalışalım</span>',
        'contact.p': 'Danışmanlık, iş birlikleri ve konuşmalar için müsaitim.',
        'contact.email': 'E-posta Gönder',
        'contact.cv': 'Özgeçmişi İndir',
        'contact.profiles': 'Profiller',
        'contact.cookies': 'Çerez tercihleri',
        'contact.rights': '&copy; 2026 Dr. Ömer Faruk Bay. Tüm hakları saklıdır.',

        'title.home': 'Dr. Ömer Faruk Bay | Biyoinformatik ve Metabolik Modelleme',
        'title.suffix': ' | Ömer Faruk Bay',
        'meta.description': 'Dr. Ömer Faruk Bay — biyoinformatik, genom ölçekli metabolik modelleme ve fonksiyonel genomik. Araştırma, yayınlar, dersler ve danışmanlık.'
    };

    var EN_TITLE = 'Dr. Ömer Faruk Bay | Bioinformatics & Metabolic Modeling';
    var metaDesc = document.querySelector('meta[name="description"]');
    var EN_DESC = metaDesc ? metaDesc.getAttribute('content') : '';

    // Remember the English source text straight from the HTML.
    var htmlNodes = document.querySelectorAll('[data-i18n]');
    var ariaNodes = document.querySelectorAll('[data-i18n-aria]');
    htmlNodes.forEach(function (el) { el.dataset.en = el.innerHTML; });
    ariaNodes.forEach(function (el) { el.dataset.enAria = el.getAttribute('aria-label'); });

    var current = 'en';

    function detect() {
        var q = new URLSearchParams(location.search).get('lang');
        if (q === 'tr' || q === 'en') return q;
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (saved === 'tr' || saved === 'en') return saved;
        } catch (e) { /* storage blocked */ }
        return (navigator.language || '').toLowerCase().indexOf('tr') === 0 ? 'tr' : 'en';
    }

    function setLang(lang, persist) {
        current = lang === 'tr' ? 'tr' : 'en';
        document.documentElement.lang = current;

        htmlNodes.forEach(function (el) {
            el.innerHTML = current === 'tr' && TR[el.dataset.i18n] !== undefined
                ? TR[el.dataset.i18n]
                : el.dataset.en;
        });
        ariaNodes.forEach(function (el) {
            var key = el.dataset.i18nAria;
            el.setAttribute('aria-label', current === 'tr' && TR[key] ? TR[key] : el.dataset.enAria);
        });
        if (metaDesc) metaDesc.setAttribute('content', current === 'tr' ? TR['meta.description'] : EN_DESC);

        document.querySelectorAll('.lang-toggle button').forEach(function (b) {
            b.setAttribute('aria-pressed', String(b.dataset.lang === current));
        });

        if (persist) {
            try { localStorage.setItem(STORAGE_KEY, current); } catch (e) { /* ignore */ }
        }
        document.dispatchEvent(new CustomEvent('langchange', { detail: current }));
    }

    window.i18n = {
        get lang() { return current; },
        homeTitle: function () { return current === 'tr' ? TR['title.home'] : EN_TITLE; },
        titleSuffix: function () { return current === 'tr' ? TR['title.suffix'] : ' | Ömer Faruk Bay'; }
    };

    document.querySelectorAll('.lang-toggle button').forEach(function (b) {
        b.addEventListener('click', function () { setLang(b.dataset.lang, true); });
    });

    setLang(detect(), false);
})();
