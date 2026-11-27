# YağızFront

Telefon öncelikli, 2–8 kişilik hanedan strateji oyunu. Yeni odalar v2 gerçek zamanlı kurallarla açılır. Önceki sıra tabanlı maçlar kendi kurallarıyla korunur.

## v2: hareketli ordular ve dinamik sınırlar

- Her yeni maçta 240×160 hücreli, denizlerle ayrılan rastgele kıtalar oluşur. Harita maç boyunca değişmez. Şehirler nokta olarak kalır; önceden çizilmiş eyalet sınırları yoktur.
- Başlangıçtaki dört şehir dönüşümlü seçilir. Başkentler seçildikten sonra tur sırası ve üç eylem sınırı kalkar; herkes aynı anda emir verebilir.
- Tüm yaşayan oyuncuların oyun ekranı açıkken simülasyon ilerler. Bir oyuncu sekmeyi gizlerse durur. Beklenmedik bağlantı kopması en geç 8 saniyelik bağlantı süresi sonunda anlaşılır. Geri dönüşte çevrim dışı geçen süre telafi edilmez. Oda sahibi ayrıca duraklatabilir.
- Haritada kendi sınırına bitişik sahipsiz kara seçip **Genişle** ile toprak kazan. Şehirlerin bulunduğu noktalar satın alınamaz; kuşatmayla ele geçirilir.
- Şehir garnizonundan ordu kur, ordunu seç, haritada hedef belirle ve yürüyüş emrini onayla. Ordu saniyede bir hücre ilerler. Düşman ordularıyla karşılaşınca çatışır, hedef şehirde kuşatma yapar. **Dur ve savun** emri yürüyüşü keser; başka hedef vererek geri çekilebilirsin.
- Deniz geçişi için liman, tersane ve gemi gerekir. Ordunun gemi kapasitesi asker sayısını karşılamalıdır. Rotalar sunucuda hesaplanır; düşman yürüyüş hedefleri ve taktikleri gizlidir.
- Kışla, çiftlik, pazar, sur ve tersane eklendi. Üretim ve araştırma yalnızca aktif oyun süresinde, 30 saniyede bir ilerler.
- Rastgele ziyaretçi/evlilik teklifinde casus olma ihtimali %50'dir. Casus olmayan teklif fayda sağlar. Oyuncunun gönderdiği suikastçı ayrı bir gizli görevdir; güvenlik ve suikast başarı ihtimalleri geçerlidir. Araştırma düğmesi v2'de kaldırıldı.
- Kaynak harcayan ve sonucu olan işlemler **Emin misin?** onayı ister. Haritada gezinme, panel açma ve seçim işlemleri onaysızdır.

Yeni kuralları görmek için **yeni oda kur**. Eski kayıtlar otomatik dönüştürülmez. Yeni motor `src/game/realtime.ts`, harita üretimi `src/game/continents.ts` içindedir.

## Vercel'e kurulum

1. Vercel'de bu GitHub reposunu **Import Project** ile seç. Framework: **Next.js**, Node.js: **24.x**. Kök dizin değişmez. Build: `npm run build`.
2. Neon'da bir PostgreSQL veritabanı oluştur; bağlantı adresini al. Vercel Marketplace üzerinden Neon bağlayabilirsin. Bağlantıda Neon'un verdiği TLS ayarlarını koru.
3. Vercel Environment Variables bölümüne aşağıdakileri ekle; sonra Deploy yap:

| Değişken | Değer |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL bağlantı adresi (pooled connection önerilir) |
| `GAME_PASSWORD` | Arkadaş grubunuz için belirlenen giriş şifresi |
| `SESSION_SECRET` | En az 32 karakterlik rastgele, gizli bir değer |

Gizli değer üretmek için: `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`

Şifre veya veritabanı bağlantısını `NEXT_PUBLIC_` değişkenlerine koyma. Gerçek şifre ve bağlantılar GitHub'a gönderilmez. Uygulama `yagiz_records` tablosunu ilk bağlantıda otomatik oluşturur; veritabanı kullanıcısının bu izni olmalıdır.

**Üretimde PostgreSQL zorunludur.** SQLite yalnızca yerel geliştirmede çalışır. Veritabanı yoksa sunucu sessizce geçici belleğe dönmez. Vercel'e deploy bu repoda otomatik yapılmaz; proje sahibi yönetir.

## Yerelde çalıştırma

Node.js 24 veya üzeri gerekir.

```sh
npm ci --ignore-scripts
```

`.env.example` dosyasını `.env.local` olarak kopyala. `GAME_PASSWORD` ve `SESSION_SECRET` değerlerini doldur. Yerelde `DATABASE_URL` boş bırakılırsa `.data/yagizfront.sqlite` kullanılır.

```sh
npm run dev
```

`http://localhost:3000` adresini aç. İki ayrı tarayıcı profili/cihazla giriş yaparak aynı oda koduna katıl. Her oyuncu kendisine verilen **kişisel kurtarma kodunu saklamalıdır**. Ortak giriş şifresi eski hanedanı kurtarmaz; kurtarma kodu eski kimliği geri getirir. Sayfa kapansa veya bağlantı kesilse de oda kaydı korunur.

## Eski kayıtlar: v1 oynanışı

- Oda sahibi, en az iki oyuncu hazır olduğunda oyunu başlatır. Dört şehir dönüşümlü, yılan sırasıyla seçilir. Her oyuncu kendi şehirlerinden birini başkent yapar.
- Her tur üç ana eylem vardır. Tur başında şehir geliri, asker üretimi, araştırma ve zamanı gelen casus görevleri işlenir. Maç veya tur zaman aşımı yoktur.
- Şehir geliştirme, asker toplama, liman, bilim merkezi ve gemi yapımı Şehirler bölümündedir. Bağımsız komşu bölgelere altınla yerleşilebilir.
- Ordu bölümünde kaynak, hedef, asker sayısı ve gizli taktik seçilir. Savunan kendi ana turunu harcamadan yanıt verir. Sahte geri çekilme, saldırgana ayrıca takip kararı sunar.
- Şehirler arasında kara komşuluğu yoksa liman, gemi kapasitesi ve deniz bağlantısı gerekir. Deniz çıkarması savaş dezavantajı taşır.
- Ticaret için iki tarafta deniz bağlantılı liman ve karşılıklı onay gerekir. Liman bağlantısı kaybolursa gelir durur.
- Evlilik ve çocuklar varis sağlar. Hükümdar ölürse ilk varis tahta geçer; başka varisler varsa isyan çıkabilir. Varissiz ölüm veya teslimiyet eler.
- Son şehrini kaybeden yaşayan hükümdar diğer ülkelere sığınma talebi gönderir. Kabul edilirse sürgünde casusluk yapabilir ve ev sahibinin limanından ücretli küçük bir sefer düzenleyebilir. Herkes reddederse elenir.
- Casuslar istihbarat, sabotaj ve suikast yapabilir. Ziyaretçi ve evlilik olaylarında kabul, araştırma ve ret seçenekleri vardır. Saray olayları tur bitmeden yanıtlanmalıdır.
- Bilim merkezleri altı aşamayı açar. İleri fizik sonrasında çalışan merkez bulunan her tur atom teknolojisi için %1 keşif ihtimali vardır. Nükleer saldırı yalnızca hedef şehri yok eder; hükümdar ölürse varis kuralları geçerlidir.
- Son yaşayan hanedan kazanır. Elenen oyuncular oyunu izleyebilir.

Maliyetler, ihtimaller ve taktik katsayıları: `src/game/balance.ts`. İlk değerler arkadaş grubuyla oyun testinde dengelenmek üzere başlangıç ayarlarıdır.

## Mimari ve doğrulama

- Next.js App Router, TypeScript, React, Phosphor, Geist ve Canvas harita.
- Sunucu otoriteli, saf oyun motoru; veritabanında sürümlü JSON kayıtları.
- Her hamlede sürüm karşılaştırması ve atomik compare-and-swap. Komut kimliği tekrar gönderildiğinde aynı eylem iki kez uygulanmaz.
- Gizli taktikler, rakip raporları, özel olaylar, güvenlik ve rastgelelik durumu sunucuda kalır.
- HTTP-only imzalı oturum, kişisel kurtarma kodu, kaynak kontrolü ve giriş denemesi sınırı.
- Aktif sayfalar iki saniyede bir güncellenir. Sunucuda sürekli çalışan WebSocket veya zamanlayıcı gerektirmez.

```sh
npm test
npm run typecheck
npm run build
npm run db:check
```

`db:check` gerçek `DATABASE_URL` gerektirir. Otomatik testler harita bağlantısı, yılan seçimi, turn-order, tekrar hamle, gizlilik, savaş/takip, çıkarma, varis, sürgün, bilim, ticaret ve kayıt yarışlarını kapsar. Yerel testler SQLite ile çalışır; gerçek Neon bağlantısını kendi ortam değişkenlerinle doğrula.

İlk sürümde botlar, açık eşleştirme, harita editörü, gerçek para işlemleri veya üretimde denenmiş ölçek garantisi yoktur. Uzun maçlar için veritabanı sağlayıcısının yedekleme imkânlarını kullan. Yeni sürüm yayınlamadan önce aktif oyun kayıtları için uyumluluk kontrolü yap.

## Lisans

GNU AGPL v3. OpenFrontIO'dan uyarlanan komşuluk algoritması için © OpenFront and Contributors atfı korunur. OpenFront'un özel lisanslı görselleri kullanılmaz. Ayrıntılar: [LICENSE](LICENSE), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Arayüz, Taste frontend v1 ve Impeccable yönergeleriyle, özgün mürekkep/parşömen yaklaşımında hazırlanmıştır.

World map update: new matches use the actual OpenFront World geography (516 × 258), with randomized city placement. Untouched v2 lobbies are upgraded automatically; matches already underway keep their saved terrain. The map data is CC BY-SA 4.0; see THIRD_PARTY_NOTICES.md.
