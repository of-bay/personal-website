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
        'nav.contact': 'İletişim',

        'hero.sub': 'Biyolojik Karmaşıklık ile Hesaplamalı Hassasiyet Arasında Köprü',
        'hero.title': 'Yaşamı Çözmek:<br><span class="gradient-text">Metabolik Modeller</span> ve Yapay Zekâ',
        'hero.lead': 'Ham omik verileri hücrelerin nasıl çalıştığına dair tahminlere dönüştüren genom ölçekli metabolik modeller ve fonksiyonel genomik iş akışları geliştiriyorum — parazitik kamçılı kurtlardan bağırsak mikrobiyomlarına kadar.',
        'hero.cta1': 'İletişime Geç',
        'hero.cta2': 'Yayınları Gör',
        'hero.card1': '🧬 Transkriptomik',
        'hero.card2': '⚡ Metabolik Modelleme',
        'hero.card3': '📊 Fonksiyonel Genomik',

        'about.title': '<span class="gradient-text">Hakkımda</span>',
        'about.p1': 'Dr. Ömer Faruk Bay, Atatürk Üniversitesi Moleküler Biyoloji ve Genetik bölümünden mezun olmuş; yüksek lisans ve doktorasını Birleşik Krallık\'taki Manchester Üniversitesi\'nde Sistem Biyolojisi ve Biyoinformatik alanında tamamlamıştır. Doktora çalışması parazitik kamçılı kurt <i>Trichuris muris</i>\'in metabolizmasına odaklanmış; bu parazit için ilk genom ölçekli metabolik modeli geliştirerek yeni terapötik hedeflerin ortaya çıkarılmasına katkı sağlamıştır.',
        'about.p2': 'Lars Kuepfer\'in grubunda doktora sonrası araştırmacı olarak, sentetik fare bağırsak bakteri topluluğu (OMM19) için genom ölçekli metabolik modellerin yeniden oluşturulması üzerine çalışmıştır. Bu bakterilerin metabolik yeteneklerini ve etkileşimlerini haritalayarak topluluğun ortak fenotipini ve bozulmalara karşı dayanıklılığını çözümlemiştir.',
        'about.p3': 'Halen AGÜ\'de Biyoinformatik dersleri veren bir öğretim görevlisidir; ayrıca fonksiyonel genomik, sistem biyolojisi ve metabolik modelleme alanlarındaki derin uzmanlığıyla danışmanlık yapmaktadır.',
        'skill.metabolic': 'Metabolik Modelleme',
        'skill.functional': 'Fonksiyonel Genomik',
        'skill.transcriptomics': 'Transkriptomik',
        'skill.systems': 'Sistem Biyolojisi',
        'skill.bioinformatics': 'Biyoinformatik',

        'vision.intro': 'Sistem biyolojisi ile yapay zekânın kesişiminde hücreyi yalnızca biyolojik bir varlık olarak değil, karmaşık ve hesaplanabilir bir ağ olarak görüyoruz. Amacımız, ham “omik” verileri hücresel metabolizmanın yüksek doğruluklu dijital ikizlerine dönüştürmektir.',
        'vision.h1': 'Vizyon',
        'vision.p1': 'Biyolojik sistemler, birbiriyle bağlantılı binlerce reaksiyonla yönetilir. Yaşamı gerçekten anlamak için bu bağlantıları haritalamalıyız. Genom Ölçekli Metabolik Modelleme (GSMM) ile organizmaların metabolik planlarını yeniden oluşturur, hücresel davranışı eşi görülmemiş bir doğrulukla simüle eder, tahmin eder ve optimize ederiz.',
        'vision.h2': 'Yaklaşımımız: Yapay Zekâ Metabolizmayla Buluşuyor',
        'vision.p2': 'Geleneksel biyoinformatik haritayı sağlarken, yapay zekâ tabanlı modelleme motoru sağlar. Gelişmiş makine öğrenmesi ve kısıt tabanlı yeniden oluşturma yöntemlerinden yararlanarak şunları yapıyoruz:',
        'vision.li1': '<strong>Akı Dinamiklerini Tahmin Etmek:</strong> Metabolitlerin karmaşık yolaklardaki akışını nicelleştirmek.',
        'vision.li2': '<strong>Biyoüretimi Optimize Etmek:</strong> Sürdürülebilir sanayi için mikrobiyal “hücre fabrikaları” tasarlamak.',
        'vision.li3': '<strong>Terapötik Hedefleri Belirlemek:</strong> Patojenlerin ve kanser hücrelerinin metabolik zayıflıklarını çözmek.',
        'vision.li4': '<strong>In Silico Deney:</strong> Binlerce genetik koşulu saniyeler içinde simüle ederek laboratuvar maliyetini ve süresini azaltmak.',
        'vision.h3': 'Neden Önemli?',
        'vision.p3': 'Büyük veri çağında zorluk artık yalnızca bilgi toplamak değil, içindeki anlamı bulmaktır. Yapay zekâyı yapısal metabolik ağlarla birleştirerek basit gözlemin ötesine geçiyor, yaşamın mantığını çözüyoruz.',

        'services.title': 'Danışmanlık <span class="gradient-text">Hizmetleri</span>',
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

        'contact.title': 'Harika bir şey <span class="gradient-text">inşa edelim</span>',
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
