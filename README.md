# Eşlik

Başlaması zor gelen işler için sakin ve yargılamayan bir ortak çalışma web uygulaması. Kullanıcı kısa bir niyet yazar, süresini seçer ve kamerasız bir odada başkalarıyla aynı anda çalışır. Odak sırasında sohbet kapalıdır, molada açılır.

> **Durum:** Bu depoda yalnızca statik bir arayüz prototipi var (`prototip/`). Backend, üyelik, veritabanı, gerçek zamanlı eşzamanlama ve veri kaydı **henüz yok**. Teknoloji yığını seçilmedi.
>
> "Eşlik" bir çalışma adıdır, kesinleşmedi. Olası adres: `eslik.melintosh.com`.

Bu belge, projede çalışan kişiler ile ürün ve kod ajanları için temel bağlam kaynağıdır. Bir değişikliğe başlamadan önce baştan sona okuyun ve [Ajan yönergeleri](#ajan-yönergeleri) bölümüne uyun.

## Ürün özeti ve hedef kullanıcı

**Eşlik nedir?** Body doubling (başka birinin varlığında çalışma) fikrinden yola çıkan, Pomodoro düzeninde ortak bir çalışma odası. Odadaki herkes aynı turu paylaşır: Bekleme → Odak → Mola. Katılımcılar birbirini kamera yerine avatar, görünen ad, kısa niyet ve durum üzerinden görür.

**Hedef:** Kendi kullanımımız ve bir portfolyo vaka çalışması için birkaç hafta içinde test edilebilir bir MVP. İlk sürüm küçük, davetli bir pilot grupla denenecek.

**Hedef kullanıcı:**

- İşe başlamakta zorlanan, yalnız çalışırken kolayca dağılan kişiler; ADHD tanısı olanlar ve benzer güçlükler yaşayanlar dahil.
- Birinin "orada" olmasından güç alan ama kamera açmak, konuşmak ya da görünür olmak istemeyenler.
- Öğrenciler, serbest çalışanlar ve uzaktan çalışanlar; özellikle ertelenen, sıkıcı ya da belirsiz işlerle uğraşanlar.

## Temel sorun ve ürün vaadi

**Sorun**

- Bazı işlerde en zor adım başlamaktır. İş büyük, belirsiz ya da sıkıcı göründüğünde ertelenir.
- Yalnız çalışırken dikkat kolay dağılır, zaman algısı kayar.
- Var olan birlikte çalışma seçenekleri çoğu zaman kamera, konuşma ya da görünür olma baskısı taşır. Verimlilik uygulamaları ise puan, seri ve kıyaslamayla ek baskı kurabilir.

**Vaat**

> Kısa bir niyet yaz, süreni seç, başkalarıyla sessizce çalış.

Kamera yok, yarış yok, suçluluk yok. Eşlik başlamayı kolaylaştırmayı, birilerinin de çalıştığını hissettirmeyi ve molayı gerçekten mola yapmayı amaçlar. Tıbbi ya da terapötik bir etki iddiası taşımaz.

## Ürün ilkeleri

- **ADHD dostu.** Az adım, az karar. Hazır varsayılanlar var (25 dk odak, 5 dk mola). Kalan süre ve bir sonraki aşamanın saati hep görünür. Aşama değişimleri belirgindir. Dikkat dağıtan öğeler en aza indirilir.
- **Düşük baskı.** Niyet isteğe bağlıdır. Tura geç katılmak ya da erken ayrılmak normaldir, cezalandırılmaz. Hiçbir şey "kaçırılmış" gibi sunulmaz.
- **Kamera gerektirmez.** Görüntü ve ses yok. Kişinin varlığı avatar, görünen ad, niyet ve durumla gösterilir.
- **Minimal / editorial.** Yumuşak nötr zemin, net tipografi (serif başlıklar, sans gövde metni), tek ve ölçülü vurgu rengi, bol boşluk. Görsel zenginlik süslemeyle değil, avatarlar ve küçük durum illüstrasyonlarıyla sağlanır.
- **Yargılamayan dil.** "Başarısız", "kaçırdın", "yine mi" gibi ifadeler kullanılmaz. Özetler yalnızca olanı aktarır: "8 dk odak · sonradan katıldı". Puan, seri, sıralama ve kullanıcılar arası kıyaslama yoktur.
- **Erişilebilir.** Durumlar yalnızca renkle değil, metin ve ikonla da anlatılır. Arayüz klavyeyle kullanılabilir. Hareket azaltma tercihine uyulur. Sesli uyarı isteğe bağlıdır ve varsayılan olarak kapalıdır.

## Güncel statik prototip

`prototip/` klasöründe tek sayfalık bir HTML/CSS/JS prototipi var. Amacı oda deneyimini ve görsel dili denemek.

### Kapsadıkları

- **Oda ekranı:** Bekleme, Odak ve Mola halleri.
  - **Bekleme:** isteğe bağlı niyet alanı (80 karakter), 15 / 25 / 45 dk seçimi (25 seçili gelir), "Turu başlat".
  - **Odak:** ortak geri sayım, ilerleme çizgisi, molanın başlayacağı saat, katılımcılar ve niyetleri, kapalı sohbet. "Turdan ayrıl" önce onay ister; ayrılan kişi "Tura geri dön" diyebilir. İptal düğmesi yok.
  - **Odak sürerken giriş:** "Kalan süreye katıl". Kayıt katılınan andan başlar; ortak zamanlayıcı değişmez.
  - **Mola:** 5 dk geri sayım ve herkese açık sohbet. Kişisel tur özeti yalnızca önceki tura katılmış kullanıcıya gösterilir.
- **Aşama geçişleri:** ekranda kısa bir bildirim ve isteğe bağlı ses (varsayılan kapalı).
- **Katılımcı listesi:** avatar, ad, niyet ve durum ("Beklemede", "Odakta", "Molada", "Turdan ayrıldı", "Henüz katılmadı"). Durumlar metin ve ikonla gösterilir.
- **Profil / avatar seçimi:** 8 özgün SVG avatar. Seçim başlıkta, katılımcı listesinde ve sohbette hemen görünür.
- **Görünüm:** masaüstü ve mobil genişliklere uyum, açık ve koyu tema.
- **Geçici önizleme kontrolü:** sayfanın altındaki koyu, kesik çizgili çubuk. Ürün arayüzünün parçası değildir, yalnızca halleri incelemek için vardır.

### Henüz yapmadıkları

- Backend, API ve veritabanı yok.
- Üyelik, giriş ve oturum yönetimi yok. Kullanıcı her zaman "Sen".
- Gerçek zamanlı eşzamanlama yok. Diğer katılımcılar, niyetleri ve mesajları sahte; zamanlayıcı yalnızca tarayıcıda çalışır.
- Veri kaydı yok. Sayfa yenilenince her şey başa döner.
- Sohbet kuralı yalnızca arayüzde uygulanıyor; sunucu tarafında denetim yok.
- Görev listesi, ödül sistemi ve oturum/görev geçmişi yok.
- Giriş, oda önü, geçmiş ve ayarlar ekranları yok.
- Otomatik test yok.

## Genişletilmiş MVP kapsamı

### 1. E-posta ile üyelik ve basit profil

- Küçük, davetli bir pilot için e-posta ile üyelik.
- Profilde görünen ad ve avatar bulunur.

### 2. Görsel avatar galerisi ve profil avatarı seçimi

- Aynı görsel dilde çizilmiş, özgün ve hazır illüstratif avatarlar.
- Kullanıcı galeriden birini seçer. Seçim odada, katılımcı listesinde ve sohbette görünür.

### 3. Ortak Bekleme / Odak / Mola odası

MVP'de davetli pilot için tek bir ortak oda olacak. Bu kurallar kararlaştırıldı:

- Oda her an tek bir senkron turdadır: Bekleme → Odak → Mola → Bekleme.
- Varsayılan 25 dk odak, 5 dk mola. Turu başlatan kişi 15, 25 ya da 45 dk seçebilir; mola her zaman 5 dk.
- Beklemede odadaki herkes tur başlatabilir. İki istek aynı anda gelirse ilk kabul edilen başlatır.
- Tur başladıktan sonra katılan kişi kalan süreye dahil olur. Odaya girmek zamanlayıcıyı sıfırlamaz.
- Ortak tur iptal edilmez. Kullanıcı yalnızca kendi katılımını bitirebilir; çıkması zamanlayıcıyı etkilemez.
- Mola bitince oda beklemeye geçer. Yeni tur kendiliğinden başlamaz.
- Niyet kişisel ve isteğe bağlıdır. O an odada bulunanlara görünür ve yeni tura taşınmaz.
- Aşama değişimleri ekranda belirgin gösterilir. Sesli uyarı isteğe bağlıdır, varsayılanı kapalıdır.
- Her kullanıcıya yalnızca gerçekten katıldığı odak süresi kaydedilir; alt sınır yoktur. Özet örnekleri:
  - "25 dk odak · turun sonuna kadar kaldın"
  - "8 dk odak · sonradan katıldı"
  - "12 dk odak · turdan ayrıldı"
- Kişisel tur özeti yalnızca o tura katılmış kullanıcıya gösterilir.

### 4. Yalnızca molada açık sohbet

- Sohbet yalnızca oda moladayken açıktır. Bekleme ve Odak'ta herkes için kapalıdır.
- Molada odaya ilk kez giren kullanıcı da yazabilir.
- Kural hem arayüzde hem sunucuda uygulanmalı. Sunucu mesajı kendi saatine ve odanın o anki aşamasına göre kabul eder ya da reddeder. Reddedilen mesajın metni kullanıcının ekranından silinmez.

### 5. Kişisel görev listesi

- Kullanıcı görevlerini küçük görevlere ya da ilk adımlara ayırabilir.
- Gelişmiş görev yönetimi (projeler, etiketler, öncelik, son tarih, paylaşım) kapsam dışıdır.

### 6. Küçük görevler için hafif ödül

- Tamamlanan küçük görevler, örneğin bir avatar aksesuarı gibi kozmetik bir şeyin açılmasını sağlayabilir.
- Sınırlar: puan ya da para birimi yok, seri şartı yok, kazanılan şey kaybedilmez, kimseyle kıyaslanmaz.
- Ayrıntılar ayrıca tasarlanacak. Statik prototipe bağlanmadı.

### 7. Kişisel oturum ve görev geçmişi

- Kullanıcı kendi geçmiş oturumlarını (tarih, süre, niyet, özet) ve tamamladığı görevleri görür.
- Geçmiş yalnızca kullanıcının kendisine görünür.

## Sonraki sürümlere bırakılanlar

- Kamera ve ses
- Yabancılarla eşleştirme
- Herkese açık oda keşfi ve çoklu oda
- Liderlik tablosu
- Seri (streak) baskısı
- Mobil uygulama. Varsayım: MVP mobil tarayıcıda kullanılabilir olacak.
- Gelişmiş analitik
- Tarayıcı bildirimleri

## Açık kararlar

Bu konular henüz karara bağlanmadı. İlgili bir değişiklikten önce sorun:

- E-posta ile giriş yöntemi: tek kullanımlık bağlantı mı, parola mı?
- Teknoloji yığını ve barındırma: backend, gerçek zamanlı katman, veritabanı.
- Görev listesi ile tur niyeti arasındaki bağ: niyet bir görevden seçilebilecek mi?
- Ödül sisteminin kuralları, görünümü ve avatar aksesuarlarıyla ilişkisi.
- Avatar galerisine fotoğraf yükleme eklenip eklenmeyeceği. Şu anki yön yalnızca hazır avatarlar.
- Pilot ölçeği: aynı anda kaç kişi?
- Ürün adı ve alan adı.

## Proje yapısı

```text
.
├── README.md          # bu belge
└── prototip/
    ├── index.html     # oda ve profil görünümleri, önizleme kontrolü
    ├── styles.css     # tasarım belirteçleri (:root), açık/koyu tema
    ├── avatars.js     # SVG avatar seti
    └── app.js         # sahte veri, aşama mantığı, etkileşimler
```

## Kurulum ve prototipi açma

Kurulum, paket yükleme ya da derleme adımı yok.

1. Prototipi doğrudan tarayıcıda açın. macOS'te depo kökünden:

   ```sh
   open prototip/index.html
   ```

   Diğer sistemlerde `prototip/index.html` dosyasına çift tıklayın.

2. İsterseniz yerel bir sunucuyla açın, sonra <http://localhost:8000> adresine gidin:

   ```sh
   python3 -m http.server 8000 --directory prototip
   ```

3. Yazı tipleri (Newsreader, Inter) Google Fonts'tan yüklenir. Çevrimdışıyken sistem yazı tipleri kullanılır, sayfa yine çalışır.

### Önizleme kontrolü

| Kontrol | Ne yapar |
| --- | --- |
| Bekleme / Odak / Mola | Odayı o hale getirir. Odak, turun 7. dakikasından açılır. Mola, önceki tura baştan sona katılmış gibi açılır. |
| Sonraki aşama → | Aktif aşamanın sonuna ileri sarar. Özetlerdeki süreler gerçek katılımdan hesaplanır. |
| Odaya gir: Odak sürerken | Odaya odak sürerken ilk kez girmiş olursun ve "Kalan süreye katıl" akışını denersin. |
| Odaya gir: Molada | Odaya molada ilk kez girmiş olursun. Sohbet açıktır, tur özeti gösterilmez. |
| Profil / avatar seçimi | Avatar seçme görünümünü açar. |
| Gizle / Göster | Çubuğu küçültür ya da açar. |

## Ajan yönergeleri

1. **Önce bu README'yi oku.** Ürün kurallarını ve kapsamı buradan al. Kodla README arasında çelişki görürsen sor.
2. **Türkçe ürün metinlerini koru.** Arayüz metinleri Türkçe ve yargılamayan bir tonla yazıldı. Gerekçesiz yeniden yazma ya da çeviri yapma; değişiklik gerekiyorsa öner.
3. **Kapsamı büyütmeden önce sor.** Yukarıdaki MVP listesinde olmayan bir özellik, ekran, bağımlılık ya da servis eklemeden önce onay al. [Açık kararlar](#açık-kararlar) bölümündeki konularda kendi başına karar verme.
4. **ADHD için tıbbi etki iddiası yazma.** "Tedavi eder", "odaklanmayı garanti eder", "bilimsel olarak kanıtlanmış" gibi ifadeler kullanma. "Kolaylaştırmayı amaçlar" gibi ölçülü ifadeler kullan.
5. **Puan, seri ya da liderlik yarışı ekleme.** Kullanıcılar arası kıyaslama, sıralama ya da seri sayacı olmayacak. Ödüller kozmetik ve baskısız kalacak.
6. **Gerçek backend veya auth varmış gibi davranma.** Prototipteki veriler sahte. Olmayan altyapıyı kodda, metinde ya da raporlarda varmış gibi anlatma. Bir şeyi doğrulamadıysan bunu açıkça söyle.
7. **Her değişikliği küçük ve incelenebilir tut.** Bir seferde tek bir konu üzerinde çalış. Neyi neden değiştirdiğini kısaca yaz.

Ayrıca:

- Durumları yalnızca renkle anlatma; metin ya da ikon ekle.
- Önizleme kontrolünü ürün arayüzünün parçası gibi tasarlama.
- Renkler ve yazı tipleri `prototip/styles.css` başındaki `:root` belirteçlerinde. Yeni renk eklemeden önce mevcut belirteçleri kullan.
