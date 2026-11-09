# PomoDoors

> Bu dal, Eşlik ürününün oyunlaştırılmış bir varyantıdır. Oda, tur ve sohbet kuralları Eşlik ile aynıdır; üzerine büyüyen bir bahçe, XP ve seviye, Yaprak, seri ve ortak bahçe eklenir. Görsel dil özgün, sıcak bir piksel sanattır.
>
> **Slogan:** Pomodoro, ama birlikte · *Pomodoro, but together.* **Konumlandırma:** Çalışırken bahçen büyür. Arayüz Türkçe ve İngilizce.

Başlaması zor gelen işler için sakin ve yargılamayan bir ortak çalışma web uygulaması. Kullanıcı kısa bir niyet yazar, süresini seçer ve kamerasız bir odada başkalarıyla aynı anda çalışır. Odakta geçen dakikalar kişinin kendi bahçesini büyütür. Odak sırasında sohbet kapalıdır, molada açılır.

> **Durum:** `prototip/` artık Supabase'e bağlı çalışan bir web uygulaması: takma adla giriş (arka planda anonim oturum), tek ortak oda, sunucuda uygulanan tur ve sohbet kuralları, kalıcı profil ve bahçe, saat ayarlı oda (her :00 ve :30'da tur), gerçek zamanlı katılımcılar, molada paylaşılan konumlar ve tepkiler, piksel karakterler, tohum çeşitleri, ortak ağaç, gerçek saate bağlı gün döngüsü, ilk giriş turu, ortam sesi, Türkçe ve İngilizce arayüz. Henüz bir yerde yayında değil; yerelde açılır.
>
> "PomoDoors" bir çalışma adıdır, kesinleşmedi.

Bu belge, projede çalışan kişiler ile ürün ve kod ajanları için temel bağlam kaynağıdır. Bir değişikliğe başlamadan önce baştan sona okuyun ve [Ajan yönergeleri](#ajan-yönergeleri) bölümüne uyun.

## Ürün özeti ve hedef kullanıcı

**PomoDoors nedir?** Body doubling (başka birinin varlığında çalışma) fikrinden yola çıkan, Pomodoro düzeninde ortak bir çalışma odası. Her odak turu kişinin bahçesine katkı olarak döner. Odadaki herkes aynı turu paylaşır: Bekleme → Odak → Mola. Katılımcılar birbirini kamera yerine avatar, görünen ad, kısa niyet ve durum üzerinden görür.

**Hedef:** Kendi kullanımımız ve bir portfolyo vaka çalışması için birkaç hafta içinde test edilebilir bir MVP. İlk sürüm küçük, davetli bir pilot grupla denenecek.

**Hedef kullanıcı:**

- İşe başlamakta zorlanan, yalnız çalışırken kolayca dağılan kişiler; ADHD tanısı olanlar ve benzer güçlükler yaşayanlar dahil.
- Birinin "orada" olmasından güç alan ama kamera açmak, konuşmak ya da görünür olmak istemeyenler.
- Öğrenciler, serbest çalışanlar ve uzaktan çalışanlar; özellikle ertelenen, sıkıcı ya da belirsiz işlerle uğraşanlar.

## Temel sorun ve ürün vaadi

**Sorun**

- Bazı işlerde en zor adım başlamaktır. İş büyük, belirsiz ya da sıkıcı göründüğünde ertelenir.
- Yalnız çalışırken dikkat kolay dağılır, zaman algısı kayar.
- Var olan birlikte çalışma seçenekleri çoğu zaman kamera, konuşma ya da görünür olma baskısı taşır. Verimlilik uygulamalarındaki puan, seri ve kıyaslama çoğu zaman cezalandırıcı kurulur: seri bozulunca her şey sıfırlanır, geride kalan kişi utandırılır.

**Vaat**

> Kısa bir niyet yaz, süreni seç, başkalarıyla sessizce çalış, bahçen büyüsün.

Kamera yok, suçluluk yok. PomoDoors başlamayı kolaylaştırmayı, birilerinin de çalıştığını hissettirmeyi ve molayı gerçekten mola yapmayı amaçlar. Oyun öğeleri cezalandırmak için değil, eşlik etmek için vardır. Tıbbi ya da terapötik bir etki iddiası taşımaz.

## Ürün ilkeleri

- **ADHD dostu.** Az adım, az karar. Hazır varsayılanlar var (25 dk odak, 5 dk mola). Kalan süre ve bir sonraki aşamanın saati hep görünür. Aşama değişimleri belirgindir. Dikkat dağıtan öğeler en aza indirilir.
- **Düşük baskı.** Niyet isteğe bağlıdır. Tura geç katılmak ya da erken ayrılmak normaldir, cezalandırılmaz. Hiçbir şey "kaçırılmış" gibi sunulmaz. Oyun öğeleri de bu kurala uyar: kazanılan bir şey geri alınmaz.
- **Kamera gerektirmez.** Görüntü ve ses yok. Kişinin varlığı avatar, görünen ad, niyet ve durumla gösterilir.
- **Sıcak piksel sanat.** Özgün piksel sanat: sıcak toprak ve bitki tonları, ahşap ve kâğıt dokulu paneller, mevsim ve gün döngüsü hissi. Piksel yazı tipi yalnızca başlıklarda ve kısa etiketlerde kullanılır; gövde metni okunaklı bir sans ile yazılır. Ekran kalabalıklaşmaz, boşluk korunur. Var olan bir oyunun çizimleri, karakterleri, arayüz parçaları ya da yazı tipi kopyalanmaz.
- **Yargılamayan dil.** "Başarısız", "kaçırdın", "yine mi" gibi ifadeler kullanılmaz. Özetler yalnızca olanı aktarır: "8 dk odak · sonradan katıldı". Oyun öğeleri de aynı sakinlikle anlatılır: "Bahçene 3 filiz eklendi" denir, "Serini kaybettin" denmez.
- **Erişilebilir.** Durumlar yalnızca renkle değil, metin ve ikonla da anlatılır. Arayüz klavyeyle kullanılabilir. Hareket azaltma tercihine uyulur. Sesli uyarı isteğe bağlıdır ve varsayılan olarak kapalıdır.

## Oyunlaştırma

Oyun öğeleri kişiye eşlik etmek için var; baskı kurmak, cezalandırmak ya da utandırmak için değil. Aşağıdakiler önerilen varsayılanlardır; açık kalan ayrıntılar [Açık kararlar](#açık-kararlar) bölümündedir. Bu öğelerin hiçbiri statik prototipte henüz yok.

### Bahçe sahnesi

- Oda, yukarıdan bakan 2B piksel bir bahçe sahnesidir. Her katılımcı sahnede bir karakterdir.
- Odakta sahne sakindir: karakterler kendi tarhlarında çalışır, bitkiler dakikalar geçtikçe büyür. Turdan ayrılan kişi evin önünde soluk görünür. Dolaşmak kapalıdır.
- Bekleme ve molada kullanıcı kendi karakteriyle dolaşabilir (ok tuşları, WASD ya da dokunarak) ve boş tarhlara tohum ekebilir. Molada sohbet mesajları karakterlerin üstünde, aynı anda tek balon olacak şekilde sırayla görünür.

### Büyüyen bahçe

- Her kullanıcının kendine ait bir bahçesi vardır. Odakta geçen dakikalar bahçeye katkı olarak döner: tohum ekilir, filizlenir, büyür.
- Katkı, gerçekten katılınan odak süresinden hesaplanır; alt sınır yoktur. Sonradan katılmak ya da erken ayrılmak da katkı sayılır.
- Bitkiler kurumaz, solmaz, ölmez. Uzun süre gelmeyen biri bahçesini bıraktığı gibi bulur.

### XP, seviye ve para birimi

- XP yalnızca odak dakikalarından gelir. Molada, sohbette ya da odada bekleyerek XP kazanılmaz; böylece mola gerçekten mola kalır.
- XP birikince seviye artar. Seviye hiçbir koşulda düşmez.
- Oyun içi para birimiyle bahçe için tohum, süs ve avatar aksesuarı alınır. Gerçek parayla satın alınmaz.
- Kazanılan XP, seviye, para ve eşyalar geri alınmaz.

### Seri

- Arka arkaya en az bir odak turuna katılınan günleri sayar.
- Haftada iki dinlenme günü seriyi bozmaz.
- Seri bozulursa kayıp mesajı, uyarı ya da kırmızı gösterge çıkmaz; sayaç sessizce yeniden başlar. En uzun seri kişinin geçmişinde kalır.
- Seri hiçbir ödülün şartı değildir. "Serin bozulmak üzere" gibi hatırlatmalar gönderilmez.

### Ortak bahçe

- Liderlik tablosunun yerini alır. Odadakilerin bu hafta birlikte topladığı odak dakikalarını tek bir toplam olarak gösterir: "Bu hafta odadakiler birlikte 340 dk odaklandı."
- Kimse sıralanmaz, kişi bazında süre gösterilmez. Her pazartesi yeniden başlar.

### Saat ayarlı oda

- Oda duvar saatine bağlıdır: her saat başı ve buçukta 25 dk odak başlar, :25'te 5 dk mola. Bekleme aşaması ve elle tur başlatma yoktur; süre seçimi (15/45) kaldırıldı.
- Odaya odak sırasında giren "Kalan süreye katıl" der. Molada sıradaki tur için niyet yazılır; "turuna beni de kat" seçiliyse (varsayılan) tur başlar başlamaz otomatik katılınır.
- Aşama sunucu saatinden hesaplanır (`room_slot`, `room_phase`); sohbet, tohum ekme ve katılım kuralları buna göre uygulanır.
- **Test modu (geçici):** `rooms.dev_mode` açıkken sayfanın altında bir test çubuğu görünür ve odak/mola süreleri herkes için kısaltılabilir (ör. 30 + 20 sn). Döngü yine duvar saatine hizalıdır. Pilot öncesi süreler 1500 + 300 sn'ye alınır ve `dev_mode` kapatılır.

### Tepkiler, ortak ağaç ve gün döngüsü

- Bekleme ve molada karakterin üstünde kısa piksel tepkiler: el sallama, kalp, kahve. Odakta kapalıdır.
- Sahnedeki ortak ağaç odanın haftalık toplam dakikasıyla büyür: 0, 60, 200, 500, 1000 ve 2000 dk'da altı aşama; son aşamada çiçek açar. Her pazartesi yeniden başlar.
- Sahne kullanıcının yerel saatine göre sabah, gündüz, gün batımı, akşam ve gece renklerine geçer; akşam ve gece evin pencereleri yanar. Açık/koyu temadan bağımsızdır.

### Tohum çeşitleri

- Papatya ücretsizdir; lale 15, havuç 20, ayçiçeği 30, çilek 40 Yaprak. Satın alınan tohum kesede durur; molada boş tarha seçilen tohum ekilir.
- İlk üç büyüme aşaması bütün çeşitlerde aynıdır; olgun hali çeşide göre değişir. Harcama gönüllüdür; hiçbir şey kendiliğinden eksilmez.

### Karakter, ilk giriş turu ve ortam sesi

- Sahnede, listede, sohbette ve profilde aynı piksel karakter. Ten, saç rengi, saç stili (kısa, uzun, bere) ve kıyafet rengi seçilir.
- İlk girişte üç adımlık, atlanabilir bir tur gösterilir.
- İsteğe bağlı ortam sesi (yağmur, kuşlar, şömine) tarayıcıda üretilir; varsayılan kapalıdır.

### Prototip varsayılanları

- 1 dk odak = 1 XP = 1 Yaprak. Para biriminin adı Yaprak.
- Her seviye 100 XP. Her yeni seviyede bahçede bir boş tarh açılır.
- Odakta geçen her 5 dk bahçede bir bitkiyi bir adım büyütür: boş tarh → tohum → filiz → genç bitki → çiçek.
- Seri, günün ilk odak katkısıyla sessizce artar; en fazla iki günlük ara seriyi bozmaz.
- Molada boş tarha tohum ekmek ücretsizdir.
- Piksel sanat 16×16 ızgarada çizilir (simgeler 8×8). Başlık yazı tipi Pixelify Sans, gövde Inter.

### Hepsi gizlenebilir

- Her oyun öğesi ayarlardan ayrı ayrı gizlenebilir. Tümünü kapatan kullanıcı sade bir ortak çalışma odası görür.

## Güncel prototip

`prototip/` klasöründe Supabase'e bağlı, tek sayfalık bir HTML/CSS/JS uygulaması var.

### Kapsadıkları

- **Oda ekranı:** Bekleme, Odak ve Mola halleri; üstte ahşap gösterge (aşama, zamanlayıcı), altında 2B piksel bahçe sahnesi.
  - **Odak:** ortak geri sayım, ilerleme çizgisi, molanın başlayacağı saat, katılımcılar ve niyetleri, kapalı sohbet. "Turdan ayrıl" önce onay ister; ayrılan kişi "Tura geri dön" diyebilir. İptal düğmesi yok.
  - **Odak sürerken giriş:** "Kalan süreye katıl". Kayıt katılınan andan başlar; ortak zamanlayıcı değişmez.
  - **Mola:** 5 dk geri sayım ve herkese açık sohbet. Kişisel tur özeti yalnızca önceki tura katılmış kullanıcıya gösterilir.
- **Aşama geçişleri:** ekranda kısa bir bildirim ve isteğe bağlı ses (varsayılan kapalı).
- **Katılımcı listesi:** avatar, ad, niyet ve durum ("Beklemede", "Odakta", "Molada", "Turdan ayrıldı", "Henüz katılmadı"). Durumlar metin ve ikonla gösterilir.
- **Profil / karakter düzenleyici:** ten, saç rengi, saç stili ve kıyafet; seçim her yerde hemen görünür.
- **Giriş:** tek alan, "Takma adın". Arka planda Supabase anonim oturumu açılır; profil ve bahçe o tarayıcıda hatırlanır.
- **Gerçek zamanlı oda:** kimin odada olduğu (presence), molada karakter konumları ve tepkiler (broadcast), tur başlangıcı ve yeni mesajlar (veritabanı değişiklikleri).
- **İki dil:** üst bardaki TR / EN düğmesi. Tüm metinler `i18n.js` içinde.
- **Görünüm:** masaüstü ve mobil genişliklere uyum, açık ve koyu tema.

### Henüz yapmadıkları

- Yayında değil; ön yüz yalnızca yerelde açılır.
- Kalıcı hesap yok. Tarayıcı verisi silinirse ya da cihaz değişirse profil taşınmaz.
- Görev listesi, mağaza ve oturum/görev geçmişi yok.
- Otomatik test yok.

- Kural hem arayüzde hem sunucuda uygulanmalı. Sunucu mesajı kendi saatine ve odanın o anki aşamasına göre kabul eder ya da reddeder. Reddedilen mesajın metni kullanıcının ekranından silinmez.

### 5. Kişisel görev listesi

- Kullanıcı görevlerini küçük görevlere ya da ilk adımlara ayırabilir.
- Gelişmiş görev yönetimi (projeler, etiketler, öncelik, son tarih, paylaşım) kapsam dışıdır.

### 6. Oyun öğeleri

- Büyüyen bahçe, XP ve seviye, Yaprak, seri, ortak bahçe ve tepkiler.
- Kurallar ve sınırlar [Oyunlaştırma](#oyunlaştırma) bölümündedir.
- Prototipte Supabase'e bağlı çalışır; ödüller sunucuda hesaplanır.

### 7. Kişisel oturum ve görev geçmişi

- Kullanıcı kendi geçmiş oturumlarını (tarih, süre, niyet, özet) ve tamamladığı görevleri görür.
- Geçmiş yalnızca kullanıcının kendisine görünür.

## Sonraki sürümlere bırakılanlar

- Kamera ve ses
- Yabancılarla eşleştirme
- Herkese açık oda keşfi ve çoklu oda
- Mobil uygulama. Varsayım: MVP mobil tarayıcıda kullanılabilir olacak.
- Gelişmiş analitik
- Tarayıcı bildirimleri

## Açık kararlar

Bu konular henüz karara bağlanmadı. İlgili bir değişiklikten önce sorun:

- Pilot sonrası kalıcı hesap: anonim oturuma e-posta bağlamak gerekecek mi? (Pilotta yalnızca takma ad.)
- Ön yüzün yayınlanacağı yer ve alan adı. Veritabanı ve gerçek zamanlı katman: Supabase, Frankfurt.
- Görev listesi ile tur niyeti arasındaki bağ: niyet bir görevden seçilebilecek mi?
- Tohum fiyatları pilotta değişsin mi? Süs ve aksesuar mağazası olacak mı?
- XP eğrisi pilotta sabit 100 XP olarak kalsın mı?
- Tamamlanan küçük görevler de XP ya da para kazandırsın mı? Kazandırırsa "XP yalnızca odaktan gelir" kuralı değişir.
- Bahçe odadaki diğer kişilere görünsün mü?
- Saat ayarlı odanın yanında serbest süreli (15/45 dk) ikinci bir oda olacak mı?
- Avatar galerisine fotoğraf yükleme eklenip eklenmeyeceği. Şu anki yön yalnızca hazır avatarlar.
- Pilot ölçeği: aynı anda kaç kişi?
- Ürün adı ve alan adı.

## Proje yapısı

```text
.
├── README.md          # bu belge
└── prototip/
    ├── index.html     # giriş, oda ve profil görünümleri
    ├── styles.css     # tasarım belirteçleri (:root), açık/koyu tema
    ├── characters.js  # piksel karakterler ve portreler
    ├── i18n.js        # Türkçe ve İngilizce metinler
    ├── scene.js       # bahçe sahnesi: canvas, karolar, karakterler, tepkiler
    ├── net.js         # Supabase bağlantısı: oturum, oda, presence, broadcast
    └── app.js         # aşama akışı, arayüz, etkileşimler
```

## Kurulum ve prototipi açma

Kurulum, paket yükleme ya da derleme adımı yok. Supabase istemcisi (supabase-js 2.118.0) CDN'den yüklenir; veritabanı Supabase'te (Frankfurt) hazırdır.

1. Yerel bir sunucuyla açın, sonra <http://localhost:8000> adresine gidin:

   ```sh
   python3 -m http.server 8000 --directory prototip
   ```

2. Takma adınızı yazıp odaya girin. İkinci bir kullanıcıyla denemek için aynı sayfayı <http://127.0.0.1:8000> adresinden açın; farklı adres ayrı tarayıcı deposu kullanır.

3. Yazı tipleri (Pixelify Sans, Inter) Google Fonts'tan yüklenir. Çevrimdışıyken sistem yazı tipleri kullanılır.

### Sunucu tarafı

- Tablolar: `profiles`, `rooms` (tek ortak oda), `participations`, `messages`. RLS açık; kullanıcı XP, Yaprak ve bahçeyi kendisi yazamaz.
- Fonksiyonlar: `room_slot`, `room_phase`, `set_room_timing` (yalnızca test modunda), `join_turn`, `leave_turn`, `claim_reward`, `buy_seed`, `plant_seed`, `room_week_minutes`.
- Yayın: `.github/workflows/pages.yml` ön yüzü (`prototip/`) `main` dalına her push'ta GitHub Pages'e çıkarır.
- Bahçe sakinleri: Fatih ve Melis sahnede her zaman bulunan iki karakterdir; gerçek kullanıcı değiller, katılımcı listesinde görünmezler.
- Ücretsiz Supabase projeleri bir hafta hiç kullanılmazsa duraklatılır; panelden tek tıkla yeniden açılır, veri silinmez.

## Ajan yönergeleri

1. **Önce bu README'yi oku.** Ürün kurallarını ve kapsamı buradan al. Kodla README arasında çelişki görürsen sor.
2. **Metinleri iki dilde ve aynı tonda tut.** Arayüz metinleri `prototip/i18n.js` içinde Türkçe ve İngilizce, yargılamayan bir tonla yazıldı. Yeni metni iki dilde ekle; gerekçesiz yeniden yazma, değişiklik gerekiyorsa öner.
3. **Kapsamı büyütmeden önce sor.** Yukarıdaki MVP listesinde olmayan bir özellik, ekran, bağımlılık ya da servis eklemeden önce onay al. [Açık kararlar](#açık-kararlar) bölümündeki konularda kendi başına karar verme.
4. **ADHD için tıbbi etki iddiası yazma.** "Tedavi eder", "odaklanmayı garanti eder", "bilimsel olarak kanıtlanmış" gibi ifadeler kullanma. "Kolaylaştırmayı amaçlar" gibi ölçülü ifadeler kullan.
5. **Oyun öğelerini [Oyunlaştırma](#oyunlaştırma) bölümündeki sınırlar içinde tut.** Kazanılanı geri alan, seri bozulunca kayıp gösteren, alt sıraları vurgulayan, oyun öğelerini zorunlu kılan ya da gerçek parayla satın alma isteyen bir şey ekleme.
6. **Kuralları sunucuda tut, olmayanı var gibi anlatma.** Tur, ödül, sohbet ve tohum kuralları Supabase fonksiyonlarında ve RLS'te. Bir kuralı yalnızca istemciye taşıma. E-posta girişi ya da yayın gibi henüz olmayan altyapıyı varmış gibi anlatma. Bir şeyi doğrulamadıysan bunu açıkça söyle.
7. **Her değişikliği küçük ve incelenebilir tut.** Bir seferde tek bir konu üzerinde çalış. Her parçayı uygulamadan önce neyi neden değiştireceğini kısaca yazıp onaya sun.

Ayrıca:

- Görseller özgün piksel sanat olmalı. Var olan bir oyunun çizimlerini, karakterlerini, arayüz parçalarını ya da yazı tipini kopyalama.
- Durumları yalnızca renkle anlatma; metin ya da ikon ekle.
- Renkler ve yazı tipleri `prototip/styles.css` başındaki `:root` belirteçlerinde. Yeni renk eklemeden önce mevcut belirteçleri kullan.
