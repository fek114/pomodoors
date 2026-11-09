---
name: eslik-core
description: PomoDoors (Eşlik'in oyunlaştırılmış varyantı; body doubling + Pomodoro ortak çalışma odası, büyüyen bahçe, XP, seri, ortak bahçe, özgün cozy piksel sanat, Türkçe ve İngilizce arayüz, Supabase altyapısı) projesinin temel çalışma kuralları. Bu depoda yapılan HER iş için kullan; prototip/ altındaki HTML/CSS/JS değişiklikleri, arayüz metni yazma ya da düzenleme, oyun öğeleri (bahçe, XP, seviye, Yaprak, seri, ortak bahçe, tepkiler), çeviri ve i18n.js, Supabase şeması, RLS ve sunucu fonksiyonları, planlı ortak turlar, piksel sanat, sprite ve avatar çizimi, görev listesi, geçmiş, sohbet, zamanlayıcı, backend veya teknoloji kararı, README güncellemesi, kod incelemesi dahil. Kullanıcı beceriyi adıyla anmasa da PomoDoors, Eşlik, oda, tur, odak, mola, niyet, bahçe, katılımcı ya da prototip geçtiğinde devreye gir. Oyun öğelerini baskısız sınırlar içinde tutar, iki dilde de sakin ve yargılamayan arayüz dilini korur, kuralları sunucuda tutar, görselleri özgün tutar ve her değişikliğin küçük parçalar halinde onaya sunulmasını sağlar.
---

# PomoDoors — temel kurallar

PomoDoors, Eşlik'in oyunlaştırılmış bir varyantı: başlaması zor gelen işler için kamerasız bir ortak çalışma odası. Odakta geçen dakikalar kişinin kendi bahçesini büyütür. Hedef kullanıcılar işe başlamakta zorlanan, yalnızken kolay dağılan kişiler; ADHD'si olanlar da dahil. Bu kişiler oyun öğelerini çoğu uygulamada cezalandırıcı biçimde yaşar: seri bozulunca her şey sıfırlanır, geride kalan kişi utandırılır. PomoDoors oyun öğelerini kullanır ama bu deneyimi tersine çevirir: **"Kamera yok, suçluluk yok. Oyun öğeleri cezalandırmak için değil, eşlik etmek için vardır."** Aşağıdaki kurallar bu vaadi korumak için var.

## Başlamadan önce

- Depo kökündeki `README.md` ürün kuralları, oyun öğelerinin sınırları, MVP kapsamı ve açık kararlar için tek doğru kaynak. Bir işe başlamadan önce ilgili bölümlerini oku; oyun öğelerine dokunan bir işte önce "Oyunlaştırma" bölümünü oku. Kodla README arasında çelişki görürsen sor.
- `prototip/` Supabase'e (Frankfurt) bağlı çalışır: takma adla giriş arka planda anonim oturumdur; oda durumu, katılımlar, ödüller ve sohbet veritabanındadır. Olmayan altyapıyı (e-posta girişi, yayındaki bir adres vb.) kodda, metinde ya da raporda varmış gibi anlatma. Doğrulamadığın bir şeyi doğrulanmamış diye belirt.
- **Kurallar sunucuda kalır.** Aşama sunucu saatinden hesaplanır; tur başlatma, katılma, ödül, sohbet kilidi ve tohum ekme veritabanı fonksiyonlarında ve RLS'tedir. Bir kuralı yalnızca istemcide uygulama; şema değişikliğinden sonra güvenlik denetimini (advisors) çalıştır.
- README'deki "Açık kararlar" listesindeki konularda (fiyatlar, kalıcı hesap, yayın yeri, pilot ölçeği vb.) kendi başına karar verme; seçenekleri kısaca sun ve sor.

## Kural 1: Oyun öğelerini baskısız sınırlar içinde tut

PomoDoors'ta dört oyun öğesi var: büyüyen bahçe; XP, seviye ve Yaprak; seri; ortak bahçe (odadakilerin bu hafta birlikte topladığı süre) ve haftalık liderlik tablosu. Çekirdek döngü hasatla kapanır (herbaryum koleksiyonu); haftalık mevsimler ve ortak ağaçla açılan yerler (meydan, çeşme, sera, fener festivali, çiçek tarlası) var, evin içine girilebilir. Sosyal tarafta temalı odalar (kapılar), linkle paylaşılan ev sahibi odaları, canlı sayaç ve "bu hafta birlikte çalıştıkların" var. Molada tepkiler (el sallama, kalp, kahve), Yaprak ile alınan tohum çeşitleri ve odanın haftalık süresiyle büyüyen ortak ağaç da var. Oda saat ayarlıdır: her :00 ve :30'da 25 dk odak, 5 dk mola. Şu an geçici test modu açık (`rooms.dev_mode`); süreleri test çubuğundan kısaltabilirsin. Pilot öncesi kapatılacak; yayın öncesi kullanıcıya hatırlat. Bunlarla çalışmak serbest, ama her biri README'deki "Oyunlaştırma" bölümünün sınırlarıyla birlikte gelir. Önerilerinde, tasarımlarında ve kodunda şunlara yer verme:

- Kazanılanı geri almak: XP, seviye, para ya da eşya kaybı; bitkilerin kuruması, solması, ölmesi
- Seri bozulunca kayıp mesajı, uyarı ya da kırmızı gösterge; "Serin bozulmak üzere" gibi hatırlatmalar; seriyi bir ödülün şartı yapmak
- Liderlik tablosunu baskı aracına çevirmek. Haftalık ilk 10 tablosu kullanıcının bilinçli ürün kararıdır ve kalır; ama "geride kaldın", "X kişiyi geç", alt sıra vurgusu, sıra düşüşü bildirimi ya da tabloya dayalı ödül ekleme. Başlık "Bu hafta en çok odaklananlar" gibi sakin kalır
- Odakta tepki, konum paylaşımı ya da sohbet açmak; odak önce gelir
- Molada, sohbette ya da odada beklerken XP vermek
- Gerçek parayla satın alma, süresi dolan fırsatlar, "kaçırma" hissi yaratan sayaçlar
- Oyun öğelerini zorunlu kılmak; her biri ayrı ayrı gizlenebilmeli

Neden: Hedef kullanıcı için kayıp ve kıyas, bir sonraki seferi "seriyi bozmamak" ya da "geride kalmamak" üzerine kurar. Kaçırılan bir gün, uygulamayı hiç açmamaya dönüşebilir. Oyun öğeleri yalnızca birikim ve eşlik hissi verdiğinde işe yarar.

Yeni bir oyun öğesi (rozet, görev, etkinlik vb.) eklemek ya da README'de açık karar olarak duran ayrıntılar (fiyatlar, küçük görev ödülü, ortak tur saatleri) hakkında kendi başına karar verme; seçenekleri kısaca sun ve sor.

Kullanıcı bu sınırları aşan bir şey isterse: hangi sınırla çeliştiğini kısaca hatırlat, baskı kurmayan bir alternatif öner ve kararı ona bırak. Onaylarsa README'yi de güncellemeyi öner. Mevcut kodda sınır dışı bir şey görürsen işaretle.

## Kural 2: Arayüz metni — iki dilde sakin ve yargılamayan

Arayüzdeki her metin olanı aktarır, kişiyi değerlendirmez. Kullanıcı ne kadar çalışmış olursa olsun metin aynı sakinlikte kalır.

**İlkeler**

- **Olanı söyle, yorumlama.** "8 dk odak · sonradan katıldı" gibi. Süre, durum, saat yeterli.
- **Eksiklik dili yok.** "başarısız", "kaçırdın", "yine mi", "maalesef", "sadece 5 dk", "hedefini tutturamadın" kullanma.
- **Abartılı övgü de yok.** "Harika!", "Süpersin!", "Muhteşem iş çıkardın" da bir yargıdır; bir dahaki sefer o övgüyü alamamak baskıya dönüşür.
- **Aciliyet ve emir yok.** "Hadi!", "Şimdi başla!", ünlem yığını, büyük harfle uyarı kullanma. Davet et: "…katılabilirsin".
- **Sade, kısa, gündelik Türkçe.** "Sen" diye hitap et. İngilizce terim karıştırma (focus, break, session yerine Odak, Mola, Tur).
- **Sabit terimler.** Aşamalar: Bekleme, Odak, Mola. Durumlar: "Beklemede", "Odakta", "Molada", "Turdan ayrıldı", "Henüz katılmadı". Bunları eş anlamlılarla değiştirme.
- **Oyun terimleri de sabit.** Bahçe, XP, Seviye, Yaprak, Seri, Ortak bahçe. Yeni bir oyun terimini kendin uydurma.
- **Her metin iki dilde.** Arayüz metni koda yazılmaz; `prototip/i18n.js` içinde hem `tr` hem `en` anahtarı olarak eklenir ve `t('anahtar')` ile kullanılır. HTML'de `data-i18n` öznitelikleri kullanılır. İngilizce de aynı sakin tonda olur: "Great job!", "Don't break your streak!", "You missed it" gibi ifadeler yok; tekil biçim için `.one` anahtarı eklenir.
- **İngilizce sabit terimler.** Waiting, Focus, Break; Focusing, On break, Left the round, Not joined yet; Garden, XP, Level, Leaves, Streak, Shared garden.
- **Doğru Türkçe karakterler.** ı, İ, ğ, ş, ç, ö, ü eksiksiz olsun; küçük/büyük harf dönüşümünde `tr-TR` yerel ayarını kullan ("i" → "İ").
- **Tıbbi iddia yok.** "Tedavi eder", "odaklanmayı garanti eder", "bilimsel olarak kanıtlanmış" yazma. "Kolaylaştırmayı amaçlar" gibi ölçülü ifadeler kullan.
- **Hata mesajları suçlamaz.** Ne olduğunu ve ne yapılabileceğini söyler; kullanıcının yazdığı metni silmez.

**Örnekler**

| Kaçın | Tercih et |
| --- | --- |
| Turu kaçırdın! | Tur 10 dk önce başladı. Kalan süreye katılabilirsin. |
| Odaktan erken çıktın, başarısız oldun. | 12 dk odak · turdan ayrıldı |
| Harika! 3 gündür üst üste çalışıyorsun 🔥 | Seri: 3 gün |
| Serin bozuldu! Sıfırdan başlıyorsun. | *(mesaj yok; sayaç sessizce yeniden başlar)* |
| Tebrikler!!! SEVİYE ATLADIN! 🎉 | Seviye 4 · bahçende yeni bir tarh açıldı |
| Sadece 8 dakikalık XP kazandın. | +8 XP · bahçene 1 filiz eklendi |
| Liderlik tablosunda 12. sıraya düştün. | Bu hafta odadakiler birlikte 340 dk odaklandı. |
| Great job! You crushed it! | 25 min of focus · stayed to the end |
| Mesaj gönderilemedi! Sohbet kapalı. | Sohbet molada açılır. Mesajın burada duruyor. |
| Niyetini yazmayı unuttun. | Niyet isteğe bağlı. |
| Hadi, odaklanma zamanı! | Odak başladı · Mola 14:25'te |

Mevcut arayüz metinleri bu tonla yazıldı. Gerekçe olmadan yeniden yazma ya da çevirme; değişiklik gerekiyorsa önce/sonra haliyle öner.

## Görsel yön: özgün cozy piksel sanat

- **Özgün kal.** Tür ilhamı serbest: sıcak tonlar, ahşap ve kâğıt paneller, bahçe, mevsimler, gün döngüsü. Ama var olan bir oyunun sprite'larını, karakterlerini, arayüz parçalarını, yazı tipini ya da müziğini kopyalama; "tıpkı X gibi görünsün" isteğini de aynı türde özgün bir tasarıma çevir.
- **Palet.** Sıcak toprak tonları, bitki yeşilleri, krem kâğıt; koyu temada gece paleti. Renkler `prototip/styles.css` içindeki `:root` belirteçlerinde tanımlanır; yeni renk eklemeden önce mevcut belirteçlere bak.
- **Yazı.** Piksel yazı tipi yalnızca başlıklarda ve kısa etiketlerde kullanılır; gövde metni okunaklı bir sans ile yazılır. Yazı tipini eklemeden önce lisansını kontrol et.
- **Piksel netliği.** 16×16 ızgara (simgeler 8×8). Sprite'lar kodla üretilir (`scene.js`, `app.js` içindeki harf dizileri), `image-rendering: pixelated` ile çizilir.
- **Sakin hareket.** Animasyonlar yavaş ve küçüktür; `prefers-reduced-motion` açıkken durur. Konfeti, zıplayan ödül efekti ya da yanıp sönen bildirim yok.
- **Karakterler.** Her yerde aynı piksel karakter (`characters.js`); görünüm ten, saç rengi, saç stili ve kıyafetten oluşur. Sahne gerçek saate göre gün döngüsüne girer.

## Kural 3: Her değişikliği küçük parçalar halinde onaya sun

Kullanıcı her adımı görüp onaylamak istiyor. Küçük parçalar ton hatalarını ve kapsam kaymasını erken yakalamayı kolaylaştırır.

1. **Önce plan.** İşi parçalara böl. Bir parça tek bir konudur: genelde tek dosyada tek bir değişiklik ya da tek bir ekranın metin grubu. Parça listesini kısa haliyle göster ve onay al.
2. **Her parçayı uygulamadan önce sun.** Şu biçimi kullan:

   ```
   Parça 2/4 — <kısa başlık>
   Dosya: <yol>
   Neden: <bir cümle>
   Değişiklik: <küçük diff ya da önce → sonra>
   Onaylıyor musun?
   ```

3. **Onay gelince uygula,** ne yaptığını tek cümleyle özetle, sonra bir sonraki parçayı sun. Onay gelmeden sonraki parçaya geçme.
4. **Yol üstünde fark ettiğin başka şeyleri** (hata, iyileştirme, kapsam dışı fikir) kendiliğinden yapma; parça sonunda bir satırla not et.
5. **Kullanıcı "hepsini yap" derse** yalnızca onayladığı kapsamı topluca uygula; kapsamı genişletme.
6. **Commit ve push** yalnızca kullanıcı isterse.

MVP listesinde olmayan bir özellik, ekran, bağımlılık ya da servis eklemek de ayrı bir onay gerektirir; bunu bir parçanın içine gizleme.

## Sunmadan önce kontrol

Her parçayı sunmadan önce kısaca gözden geçir:

- Oyun öğeleri README'deki sınırlar içinde mi? Kayıp, baskı ya da zorunluluk yok mu, her biri gizlenebiliyor mu?
- Görseller özgün mü? Piksel yazı tipi yalnızca başlıklarda mı?
- Metinler olanı mı aktarıyor, yoksa yargılıyor ya da övüyor mu?
- Tıbbi bir iddia var mı?
- Durumlar yalnızca renkle değil, metin ya da ikonla da anlatılıyor mu? Klavyeyle kullanılabiliyor mu? `prefers-reduced-motion` gözetiliyor mu? Ses varsayılan olarak kapalı mı?
- Renk ve yazı tipleri `prototip/styles.css` başındaki `:root` belirteçlerinden mi geliyor?
- Yeni metin `i18n.js` içinde iki dilde mi, İngilizcesi de sakin mi?
- Bir kural yalnızca istemcide mi uygulanıyor? Sunucu fonksiyonu ya da RLS gerekiyor mu?
- Parça gerçekten küçük ve tek konulu mu?
