# Önceki hesaplama ve hata notları

Tarihsel kayıt; etkin kurallar src/tradeupRules.mjs içindedir.

```js
  // OTOMATİK HESAPLAMA (Hesapla butonuna gerek yok)
  useEffect(() => {
    const validSlots = slots.filter(Boolean);
    if (validSlots.length === 0) { setAnalysis(null); return; }

    const inputRarity = validSlots[0].skin.rarity?.name;
    // ÖZEL TARİF (Custom Recipe): 5x Covert (Kırmızı) girdi -> Sarı (Bıçak/Eldiven) çıktısı.
    // Gerçek CS2 hiyerarşisinde Covert'ün üstü yoktur; bu geçiş simülatöre özeldir.
    const isKnifeRecipe = inputRarity === 'Covert';
    const targetRarity = isKnifeRecipe ? 'Covert' : NEXT_RARITY_NAME[inputRarity];
    if (!targetRarity) { setAnalysis(null); return; }

    // ============================================================
    // ÇIKTI FLOAT'I — GERÇEK CS2 FORMÜLÜ (NORMALİZE ORTALAMA)
    // ============================================================
    // ⚠️ BUG DÜZELTMESİ (31 Ağu 2026, kullanıcı bildirimi: "float değiştirince
    // çıkan eşyanın aşınması bir üste bir alta rastgele zıplıyor").
    //
    // KÖK NEDEN: Eski kod girdilerin HAM float ortalamasını alıp doğrudan
    // çıktının aralığına oturtuyordu:
    //
    //     f = outMin + ortalamaHamFloat * (outMax - outMin)          // ← YANLIŞ
    //
    // Bu, her skinin float aralığının FARKLI olduğunu görmezden gelir.
    // Örnek: aralığı 0.45–1.00 olan bir skin (yalnızca WW/BS basılabilir)
    // 0.50 float ile TAKILABİLECEK EN İYİ hâlindedir — aralığındaki konumu
    // (0.50-0.45)/0.55 = 0.09, yani neredeyse "Factory New" konumu. Eski kod
    // ham 0.50'yi kullandığı için bunu "orta karar" sayıyor ve çıktıyı
    // Field-Tested'a gönderiyordu. Aynı çubuğu birkaç piksel oynatmak,
    // aralıkları farklı iki girdide bambaşka yönlere kayan bir ortalama
    // ürettiği için sonuç rastgele görünüyordu.
    //
    // DOĞRUSU (csfloat.com / tradeupcalculator.com ile aynı):
    //   1. Her girdi KENDİ aralığına göre normalize edilir:
    //          n_i = (float_i - min_i) / (max_i - min_i)        -> 0..1
    //   2. Bu normalize değerlerin ortalaması alınır:  n̄ = Σn_i / N
    //   3. Ortalama, ÇIKTININ kendi aralığına ölçeklenir:
    //          outFloat = outMin + n̄ * (outMax - outMin)
    //
    // Böylece "girdilerin aşınma yüzdesi" ile "çıktının aşınma yüzdesi" aynı
    // şey olur: hepsi FN yakınıysa çıktı da FN yakını gelir, hepsi yıpranmışsa
    // çıktı da yıpranmış gelir. Artık deterministik ve öngörülebilir.
    //
    // ⚠️ SIFIR GENİŞLİK KORUMASI: `min_float === max_float` olan (veya alanları
    // eksik olup ikisi de aynı varsayılana düşen) eşyalarda bölme 0/0 olur ve
    // NaN üretir; o durumda konum 0 kabul edilir.
    const normalizedFloats = validSlots.map(e => {
      const mn = e.skin.min_float ?? 0;
      const mx = e.skin.max_float ?? 1;
      const span = mx - mn;
      if (!(span > 0)) return 0;
      return Math.min(1, Math.max(0, (e.float - mn) / span));
    });
    const avgNormFloat = normalizedFloats.reduce((a, n) => a + n, 0) / normalizedFloats.length;
    // Panelde gösterilen "Ortalama Float": kullanıcının kartlarda gördüğü
    // sayıların ham ortalaması. Hesaplamada KULLANILMAZ (yukarıya bakın),
    // yalnızca bilgi amaçlıdır.
    const avgFloat = validSlots.reduce((a, e) => a + e.float, 0) / validSlots.length;
    // Slotların fiyatları zaten seçim/float değişimi anında hesaplanıp entry.price'ta saklanıyor
    // ⚠️ `e.price` DEĞİL `effectivePrice(e)`: kullanıcı elle fiyat girdiyse
    // maliyet ondan hesaplanmalı (bkz. effectivePrice).
    const totalCost = validSlots.reduce((acc, e) => acc + effectivePrice(e), 0);

    // GERÇEK CS2 KURALI: Çıktı havuzu girdi eşyaların AİT OLDUĞU koleksiyon(lar)dan
    // belirlenir. Her girdi kendi koleksiyonuna "oy" verir; 10 eşya farklı
    // koleksiyonlardan geliyorsa çıktı havuzu bu oranlarla ağırlıklandırılır
    // (tıpkı gerçek oyunda olduğu gibi).
    // ⚠️ HER GİRDİ TOPLAM **1** OY KULLANIR (30 Ağu 2026 düzeltmesi).
    // Eski kod, eşya birden fazla koleksiyonda geçiyorsa her koleksiyona AYRI
    // bir tam oy veriyordu; 5 koleksiyonda geçen bir skinden 10 tane koyunca
    // toplam oy 10 yerine 50 oluyor ve o eşyanın ağırlığı yapay olarak 5 katına
    // çıkıyordu (doğrulandı: 1788 eşyanın 53'ü birden fazla koleksiyonda).
    // Artık oy, eşyanın koleksiyonları arasında EŞİT BÖLÜNÜYOR.
    const collectionVotes = {};   // collectionId -> toplam oy ağırlığı
    const collectionById = {};
    validSlots.forEach(entry => {
      const cols = collectionsOf(entry.skin);
      if (cols.length === 0) return;
      const weight = 1 / cols.length;
      cols.forEach(col => {
        collectionVotes[col.id] = (collectionVotes[col.id] || 0) + weight;
        collectionById[col.id] = col;
      });
    });

    const buildOutcome = (t, priceRarityOverride) => {
      // ⚠️ ARALIK `t`'DEN DEĞİL, `skins.json`'DAN GELİR. `t` koleksiyon
      // kaydıdır ve float alanları taşımaz (bkz. floatRangeById açıklaması).
      const range = floatRangeById.get(t.id);
      const skin = range ? { ...t, ...range } : t;

      const targetMin = skin.min_float ?? 0;
      const targetMax = skin.max_float ?? 1;

      // Hedefin KENDİ aralığında, girdilerin NORMALİZE ortalama konumuna
      // karşılık gelen nokta (gerçek CS2 formülü).
      const f = parseFloat((targetMin + avgNormFloat * (targetMax - targetMin)).toFixed(4));

      // ⚠️ `stable: true` ZORUNLU: liste fiyata göre sıralanıyor; varyanslı
      // simüle fiyat kullanılırsa her float oynatmasında satırlar yer değiştirir.
      // ⚠️ Fiyat `skin` ile sorgulanır (aralığı dolu olan kopya): aşınma ondan
      // türediği için market_hash_name de doğru kuruluyor.
      return {
        skin,
        outFloat: f,
        outWear: getWearFromFloat(f),
        price: getRealisticPrice(priceMap, skin, f, false, priceRarityOverride ?? targetRarity, false, { stable: true }),
      };
    };

    let possibleOutcomes = [];
    const totalVotes = Object.values(collectionVotes).reduce((a, b) => a + b, 0);

    // ============================================================
    // ÖZEL TARİF: 5x COVERT (Kırmızı) -> RASTGELE BIÇAK / ELDİVEN
    // ============================================================
    // Koleksiyon oylaması burada UYGULANMAZ: bıçaklar hiçbir silah
    // koleksiyonuna ait değildir, ayrı bir havuzdur. Bu yüzden tüm bıçak
    // + eldiven veritabanı eşit ihtimalle çıktı havuzunu oluşturur. Fiyatlandırmada
    // 'Rare Special' kullanıyoruz — bıçak/eldivenler Covert silahlardan çok daha pahalıdır.
    if (isKnifeRecipe) {
      if (knifePool.length > 0) {
        const per = 100 / knifePool.length;
        knifePool.forEach(k => possibleOutcomes.push({ ...buildOutcome(k, 'Rare Special'), chance: per }));
      }
    } else if (totalVotes > 0) {
      // ============================================================
      // GERÇEK CS2 FORMÜLÜ
      // ============================================================
      // Bir koleksiyondan gelen her girdi o koleksiyona bir "bilet" verir.
      // Çekilişte önce bilet seçilir (koleksiyon belirlenir), sonra o
      // koleksiyonun bir ÜST kademesindeki eşyalar arasından EŞİT ihtimalle
      // biri seçilir. Yani:
      //
      //     P(eşya) = (o koleksiyonun oyu / toplam oy) / (o kademedeki eşya sayısı)
      //
      // ⚠️ HAVUZ TEK EŞYAYA İNDİRGENMEZ: `eligible` o koleksiyonun hedef
      // kademesindeki TÜM uygun eşyaları taşır. Örnek (doğrulandı):
      // The Harlequin Collection'da Restricted kademesi 2 eşya içeriyor →
      // AWP | Exothermic %50, USP-S | Sleeping Potion %50.
      //
      // ⚠️ Aynı eşya iki koleksiyonda birden geçiyorsa ihtimalleri TOPLANIR
      // (iki ayrı satır olarak listelenmez) — aksi hâlde kullanıcı aynı eşyayı
      // listede iki kez görür ve yüzdeler tek tek yanlış görünür.
      const byId = new Map();
      Object.keys(collectionVotes).forEach(colId => {
        const col = collectionById[colId];
        const voteShare = collectionVotes[colId] / totalVotes;
        const eligible = (col.contains || []).filter(s => s.rarity?.name === targetRarity && isValidTradeUpOutput(s));
        if (eligible.length === 0) return;
        const perItemChance = (voteShare * 100) / eligible.length;
        eligible.forEach(t => {
          const key = t.id || t.name;
          const existing = byId.get(key);
          if (existing) existing.chance += perItemChance;
          else byId.set(key, { ...buildOutcome(t), chance: perItemChance });
        });
      });
      possibleOutcomes = [...byId.values()];
    }

    // Yedek yol: girdi eşyaların koleksiyonu haritada bulunamazsa (veri eksikse)
    // eski davranışa (genel havuzdan rastgele) düş — site asla boş kalmasın.
    // ÖNCELİKLENDİRME: API'nin döndürdüğü SIRAYA göre ilk 10'u almak yerine
    // (bu, tanıdık Covert eşyaların ör. Asiimov neredeyse hiç çıkmamasına
    // sebep oluyordu — veri eksik değildi, sadece gömülüydü) POPULAR_SKIN_PRIORITY
    // listesindeki eşyaları öne alıyoruz.
    if (possibleOutcomes.length === 0 && !isKnifeRecipe) {
      const candidates = allSkins.filter(s => s.rarity?.name === targetRarity && isValidTradeUpOutput(s));
      const prioritized = [...candidates].sort((a, b) => {
        const ai = POPULAR_SKIN_PRIORITY.indexOf(a.name);
        const bi = POPULAR_SKIN_PRIORITY.indexOf(b.name);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
      const targets = prioritized.slice(0, 10);
      if (targets.length > 0) {
        targets.forEach(t => possibleOutcomes.push({ ...buildOutcome(t), chance: 100 / targets.length }));
      }
    }

    // Yuvarlama farklarını normalize et (toplam şans tam %100 olsun)
    const totalChance = possibleOutcomes.reduce((a, o) => a + o.chance, 0);
    if (totalChance > 0 && Math.abs(totalChance - 100) > 0.01) {
      possibleOutcomes = possibleOutcomes.map(o => ({ ...o, chance: (o.chance / totalChance) * 100 }));
    }

    // ⚠️ ELLE GİRİLEN ÇIKTI FİYATLARINI EV'DEN ÖNCE UYGULA. Sonra uygulanırsa
    // kart "Beklenen Değer $12" derken kâr ihtimali başka bir fiyat setine
    // göre hesaplanır ve ikisi çelişir.
    possibleOutcomes = possibleOutcomes.map(o => {
      const key = o.skin.id || o.skin.name;
      const ov = outcomePrices[key];
      return ov != null ? { ...o, price: ov, userPriced: true } : o;
    });

    const ev = possibleOutcomes.reduce((a, o) => a + o.price * (o.chance / 100), 0);

    // ============================================================
    // KÂR İHTİMALİ — "%X ihtimalle kâr"
    // ============================================================
    // EV tek başına yanıltıcıdır: %1 ihtimalle çıkan çok pahalı bir eşya EV'yi
    // yukarı çeker ama sözleşmelerin %99'u zararla biter. Bu satır kullanıcıya
    // "kaç kere kârlı çıkarım" sorusunun cevabını verir.
    //
    // Tanım: girdilerin TOPLAM piyasa değerinden daha değerli olan çıktıların
    // ihtimallerinin toplamı. Eşitlik kâr sayılmaz (başa baş).
    // ⚠️ `possibleOutcomes` normalize edildikten SONRA hesaplanmalı — aksi
    // hâlde ham ihtimaller toplandığı için %100'ü aşabilir.
    const profitChance = possibleOutcomes.reduce(
      (a, o) => a + ((o.price ?? 0) > totalCost ? o.chance : 0), 0
    );
    const sourceCollectionNames = isKnifeRecipe
      ? ['Bıçak / Eldiven Havuzu (Simülatöre Özel Kural)']
      : totalVotes > 0
        ? Object.keys(collectionVotes).map(id => collectionById[id]?.name).filter(Boolean)
        : [];
    setAnalysis({ avgFloat, avgNormFloat, profitChance, totalCost, ev, outcomes: possibleOutcomes, sourceCollectionNames, isKnifeRecipe });
  }, [slots, allSkins, priceMap, skinToCollections, knifePool, outcomePrices, floatRangeById]);


```

```js
  // Eşya adı -> ait olduğu koleksiyon(lar) ters-haritası. Gerçek CS2'de trade-up
  // ÇIKTISI, girdi eşyalarının ait olduğu koleksiyondan gelir (rastgele tüm
  // veritabanından değil!). Bu harita, "10 tane MP5 Piknik koysam bambaşka bir
  // koleksiyondan eşya çıkıyor" bug'ının kökten çözümü için gerekli.
  // ⚠️ ANAHTAR AD DEĞİL, KİMLİK (30 Ağu 2026). İsim çakışabiliyor: "Recoil AK-47"
  // hem bir grafiti hem de bir silah adı olarak 19 ayrı koleksiyonda geçiyor.
  // Kimlikler benzersiz ve skins.json ile %100 eşleşiyor (doğrulandı).
  // Ada göre yedek arama, kimliği olmayan eski/elde üretilmiş objeler için korunur.
  //
  // ⚠️ AYNI KOLEKSİYON İKİ KEZ EKLENMEZ: eklenirse o koleksiyon çekilişte
  // iki kat ağırlık kazanırdı.
  const skinToCollections = useMemo(() => {
    const map = {};
    (allCollections || []).forEach(col => {
      (col.contains || []).forEach(item => {
        const keys = [item?.id, item?.name].filter(Boolean);
        keys.forEach(key => {
          if (!map[key]) map[key] = [];
          if (!map[key].some(c => c.id === col.id)) map[key].push(col);
        });
      });
    });
    return map;
  }, [allCollections]);

  // Bir girdi eşyasının ait olduğu koleksiyonlar (önce kimlik, sonra ad).
  const collectionsOf = (skin) =>
    skinToCollections[skin?.id] || skinToCollections[skin?.name] || [];

  // SARI (ÖZEL) HAVUZ: Covert->Bıçak/Eldiven özel tarifinin çıktı havuzu.
  // Veritabanındaki TÜM bıçaklar (576) ve eldivenler (94) eşit ihtimalle çıkabilir.
  const knifePool = useMemo(
    () => (allSkins || []).filter(s => isKnife(s) || isGloves(s)),
    [allSkins]
  );


```

```js
  // ============================================================
  // ÇIKTI HAVUZU İÇİN GERÇEK FLOAT ARALIĞI
  // ============================================================
  // ⚠️ KRİTİK BUG (2 Eyl 2026, ölçüldü): Trade-Up ÇIKTILARI
  // `collections.json` içindeki kayıtlardan üretiliyor ve o dosyada
  // `min_float`/`max_float` alanları **HİÇ YOKTUR** (1455 skinin 0'ında var).
  // `t.min_float ?? 0` yedeği yüzünden çıktıların **%75.9'u** uydurma
  // 0.00–1.00 aralığıyla hesaplanıyordu.
  //
  // İKİ AYRI SEMPTOM ÜRETİYORDU:
  //   1. YANLIŞ AŞINMA — `SSG 08 | Slashed` gerçekte 0.15'ten başlar, yani
  //      Factory New olması İMKÂNSIZDIR; kod onu FN üretebiliyordu.
  //   2. YANLIŞ FİYAT — sonra "SSG 08 | Slashed (Factory New)" diye piyasada
  //      VAR OLMAYAN bir market_hash_name kuruluyor, canlı fiyat bulunamıyor
  //      ve eşya sessizce simüle fiyata düşüyordu.
  //
  // GİRDİ tarafında bu sorun yoktu: yuvalar `allSkins` (skins.json) üzerinden
  // seçiliyor ve orada aralıklar dolu. Asimetri tam olarak buydu.
  //
  // ⚠️ EŞLEŞTİRME KİMLİKLE: ada göre eşleştirme bu projede daha önce hataya
  // yol açtı (aynı ad birden fazla türde geçebiliyor).
  const floatRangeById = useMemo(() => {
    const m = new Map();
    (allSkins || []).forEach(sk => {
      if (sk?.id && (sk.min_float != null || sk.max_float != null)) {
        m.set(sk.id, { min_float: sk.min_float, max_float: sk.max_float });
      }
    });
    return m;
  }, [allSkins]);


```
