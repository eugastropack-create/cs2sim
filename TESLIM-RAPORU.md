# SkinSimulator — güncelleme ve yükleme raporu

Teslim: 13 Eylül 2026. İnceleme ve fiyat örnekleri: 12 Eylül 2026.

## Hangi dosya ne işe yarar?

- **skinsimulator-yeni-kodlar.zip:** GitHub deposuna aktarılacak kaynak kod. ZIP dosyasının kendisini değil, içindeki dosya ve klasörleri yükleyin. `.github` klasörünü atlamayın.
- **skinsimulator-yayina-hazir.zip:** Derlenmiş web sitesi. Dosya yükleyerek yayın yapan barındırma servisinde kök dizine açılabilir. GitHub kaynak deposundaki App.js yerine bu paketi koymayın.
- **skinsimulator-orijinal-yedek.zip:** Çalışmaya başlamadan önce alınan, değiştirilmemiş kaynak yedeği. Başlangıç commit'i: `f8b6962a24cac963f2ef05343cd7e32c79cd61ca`.

Değişiklikler yerel dosyalarda hazırlandı. GitHub'a push, üretim sitesine dağıtım veya AdSense başvurusu gönderilmedi.

## Bulunan ve düzeltilen sorunlar

### Fiyat verisi

İncelenen fiyat dosyasının güncelleme tarihi yeniydi, fakat Steam yedeği **8 Ağustos 2026** tarihliydi; yaklaşık **35 günlük** veri içeriyordu. Birincil Skinport verisi ise günceldi. Eski kod güncel Skinport fiyatlarını bu eski Steam verisinden türetilen katsayıyla yükseltiyordu. İncelenen dosyada katsayı **1.2829** idi.

Yeni sürümde:

- Eski Steam görüntüsüne göre kalibrasyon yapılmıyor. Böyle bir durumda Skinport'un USD referans değeri korunuyor. Bu nedenle bazı rakamların önceki sürümden düşük görünmesi beklenir; para birimi hatası değildir.
- Her fiyatın kaynağı, kaynak tarihi ve tahmin olup olmadığı veri dosyasında ayrı tutuluyor.
- Aşınma kötüleştikçe fiyat mutlaka düşmeli varsayımıyla piyasa verisini değiştiren işlem varsayılan olarak kapatıldı. Koleksiyon piyasasında fiyat sıralaması her zaman monoton olmak zorunda değildir. Eski model isteğe bağlı korunuyor, kullanılırsa sonuçlar tahmin olarak işaretleniyor.
- StatTrak/Souvenir kaydı eksikken normal skin fiyatını kullanma hatası giderildi.
- StatTrak bıçaklarının piyasa adı düzeltildi: `★ StatTrak™ ...`.
- Hatalı/boş JSON ve bağlantı zaman aşımı yedek kaynağı devreye alıyor.
- Skinport çağrısına belgelenen Brotli başlığı eklendi; API anahtarı istemeyen mevcut sağlayıcı kullanılmaya devam ediyor.
- Karşılaştırma ve beklenen değer hesaplarında eksik veriye uygulanan simüle fiyat rastgele değişmiyor.

Hazırlanan başlangıç görüntüsünde **35.139** fiyat var: **25.134 Skinport** ve **10.005 Steam yedeği**. Bu sayıların tümü güncel fiyat değildir. Eski ya da doğrulanamayan kayıtlar sözleşme özetinde uyarı doğurur. Başlangıç dosyası `public/prices/bootstrap.json` içindedir; sürekli güncellemenin yerine geçmez.

### Trade-up doğruluğu ve kullanım akışı

- Beş Covert girdide tüm oyunun bıçak/eldivenlerini rastgele sunan havuz kaldırıldı. Çıktılar girdilerin bağlı olduğu kasalardan oluşturuluyor.
- Normal ve StatTrak sözleşmeleri ayrıldı. StatTrak modunda eldiven çıktısı yok; Souvenir girdisi ve farklı varyantların karışımı reddediliyor.
- Girdinin geçerli üst kademe sonucu yoksa, ilgisiz popüler eşyalardan sahte bir çıktı havuzu oluşturulmuyor.
- Float aralığı olmayan silah girdileri hesaplamaya alınmıyor. Başlangıç float değeri gerçek aralıkta tutuluyor.
- Çıktı float'ı aşınma bandı seçilmeden önce yuvarlanmıyor. Sınırdaki değerlerin yanlış aşınmaya geçmesi önleniyor.
- Vanilla bıçaklarda var olmayan aşınma bilgisi gösterilmiyor; sonuç ekranı null float ile hata vermiyor.
- Eksik/eski/modellenmiş fiyatları içeren kâr hesabı açıkça tahmin olarak gösteriliyor. Komisyon ve tekil float/desen primlerinin dahil olmadığı açıklanıyor.
- Uzun çıktı listesinde “daha fazla göster” eklendi; ilk 24 sonucun ötesi de incelenebiliyor.
- Negatif, harfli veya bozuk fiyat girdisinin başka bir pozitif rakama dönüşmesi önlendi. Escape ile iptal edilen düzenleme, odak kaybında kaydedilmiyor.

Olasılık hesabı, kaynak koleksiyon/kasa verisi içindeki eşit pay modelidir. Özel desen ve Doppler fazlarının gerçek piyasa primleri/ayrı olasılıkları modellenmez. Bu araç gerçek oyunda kâr veya birebir her sözleşme sonucunu garanti etmez.

### İçerik, erişim ve AdSense hazırlığı

- Rehber, hakkımızda, gizlilik ve iletişim içerikleri iki dilde toplam **12 bağımsız HTML sayfası** olarak üretildi. Uygulama içi rehber de aynı metin kaynağını kullanır.
- `robots.txt`, `sitemap.xml` ve yayıncı kimliğine uygun `ads.txt` eklendi.
- Alt bilgi/rehber bağlantılarına gerçek adresler verildi. Normal uygulama içi tıklamalarda oturum korunur.
- İletişim sayfasındaki “yayından önce bu paragrafı değiştirin” taslağı kaldırıldı; mevcut e-posta adresi korundu.
- Gizlilik metnindeki “kişisel bilgi iletmiyoruz” ve “yalnızca tek tercih saklanıyor” ifadeleri, mevcut FormSubmit formu, Analytics, AdSense ve tema tercihiyle uyumlu hale getirildi.
- Beş Covert takasının oyunda bulunmadığını söyleyen eski rehber düzeltildi. Valve bu özelliği 22 Ekim 2025'te eklemişti.
- Google Analytics, Search Console ve AdSense kimlikleri korundu.

SkinSimulator için ret bildirimi görmedim; sizin aktardığınız durum incelemenin sürdüğü yönündeydi. Bu değişiklikler teknik ve içerik kalitesini artırır; **AdSense onayı garantisi değildir**.

## TradeUpLab neden doğrudan bağlanmadı?

Verdiğiniz hesaplayıcı ve halka açık sayfalar incelendi; dış sitelerin kullanımı için belgelenmiş, halka açık bir fiyat API'si bulunamadı. Özel oturum uç noktası veya ekran kazımasına bağımlı bir sistem eklenmedi. Mevcut ücretsiz Skinport API'si sağlamlaştırıldı. TradeUpLab ileride resmi API erişimi verirse, sağlayıcı adaptörü üzerinden eklenebilir.

Kaynaklar:

- [Skinport Items API](https://docs.skinport.com/items): kimlik doğrulamasız fiyat/ürün uç noktası, fiyat alanları ve istek sınırları.
- [Valve — 22 Ekim 2025 güncellemesi](https://store.steampowered.com/news/app/730/view/516350567072662004): beşli Covert ve StatTrak kuralları.
- [TradeUpLab hesaplayıcı](https://www.tradeuplab.com/tradeups/calculate/): inceleme referansı.
- [Google yayıncı politikaları](https://support.google.com/adsense/answer/10502938?hl=tr).
- [Google kullanıcı rızası yönetimi koşulları](https://support.google.com/adsense/answer/13554116?hl=tr).

## Yükleme adımları

1. Orijinal yedeği saklayın. Kaynak ZIP'ini açın ve dosyaları **skinsimulator** deposuna, aynı klasör yapısıyla aktarın. `chestsim` deposuyla karıştırmayın.
2. Barındırma servisi GitHub'dan derliyorsa derleme komutunu **`npm run build:web`**, yayın klasörünü **`dist`** yapın. Node 22 veya desteklenen daha yeni bir sürüm kullanın. Yerel hazırlık için `npm ci`, ardından `npm run build:web` yeterlidir.
3. GitHub **Actions** bölümünde mevcut fiyat güncelleme iş akışını **Run workflow** ile bir kez çalıştırın. Sonrasında iki saatlik mevcut zamanlama devam eder; GitHub zamanlamayı geciktirebilir. İş akışının yazma izni ve `prices-data` dalına yazabilmesi gerekir.
4. Ücretsiz Skinport için yeni anahtar gerekmez. Mevcut ücretli sağlayıcı anahtarları varsa yalnızca GitHub Secrets içinde bırakın. Anahtarları site dosyalarına yazmayın.
5. Yayından sonra `/guides/tr/tradeup.html`, `/guides/en/privacy.html`, `/sitemap.xml`, `/ads.txt` adreslerinin açıldığını kontrol edin. Search Console'a `https://skinsimulator.com/sitemap.xml` adresini gönderin.
6. Fiyat panelindeki kaynak tarihine bakın. İlk dağıtımda 12 Eylül tarihli başlangıç dosyası kullanılabilir; yeni iş akışı çalıştığında uzaktaki güncel besleme önceliklidir. “Eski/tahmini” uyarısını kaldırmak için tarihi değiştirmeyin; kaynak gerçekten yenilenmelidir.

### Hesap sahibinin kontrol etmesi gerekenler

- AdSense **Gizlilik ve mesajlaşma** bölümünde uygun kullanıcı rızası mesajının yayımlandığını kontrol edin. Google, AEA/Birleşik Krallık/İsviçre'de kişiselleştirilmiş reklamlar için sertifikalı CMP ister. Bu hesap ayarının etkinliğini kaynak kodundan doğrulayamadım.
- FormSubmit aktivasyonunun tamamlandığını mevcut e-posta hesabınızdan kontrol edin. Test amacıyla size veya başka birine mesaj göndermedim.
- AdSense durumunu panelden takip edin; yalnızca dosya yüklemek inceleme sonucunu anında değiştirmez.

## Doğrulama

- Expo web üretim derlemesi başarılı.
- Sekiz otomatik regresyon testi başarılı: koleksiyon ağırlıkları, geçersiz girdiler, Covert havuzu/StatTrak, float sınırları, cent/USD dönüşümü, fiyat yaşı, varyant fiyat eşlemesi ve vanilla bıçak.
- Tarayıcıda normal onlu sözleşme, beşli StatTrak sözleşmesi, sonuç ve envantere aktarım kontrol edildi.
- Kasa 1/5/10 açılışları, terminal 1/5–5/5 teklifleri ve son teklif alma, Souvenir, Sticker, Armory koleksiyonu, Charm ve Limited Edition açılışları çalıştı.
- Koleksiyon ekranı ve “Glove” global araması sonuç verdi. Tema değişiminde envanter korundu; Türkçe rehber metni ve bağlantıları doğrulandı.
- 390 piksel mobil genişlikte yatay sayfa taşması bulunmadı. Tüm cihaz/tarayıcı kombinasyonları denenmedi.
- Konsolda görülen `shadow*` ve `pointerEvents` uyarıları mevcut React Native Web uyumluluk uyarılarıydı; kontrol edilen akışlarda uygulamayı durduran hata görülmedi.

## Geri dönüş

Üretimde sorun çıkarsa barındırma servisinden önceki dağıtımı geri yükleyin veya `skinsimulator-orijinal-yedek.zip` içeriğini ayrı bir klasöre açarak orijinal sürümü yeniden derleyin. Kaynak geçmişinde başlangıç commit'i de geri dönüş referansıdır. Yeni eklenen dosyalar GitHub'da kalabilir; tam kaynak geri dönüşünde commit geri alma tercih edilir. Fiyat iş akışı kodunu da önceki sürüme döndürmek, sonraki fiyat yayınını eski modele geri alır.
