# YağızFront

Telefon öncelikli, 2–8 kişilik, sıra tabanlı hanedan strateji oyunu. Rastgele haritada dört şehir seç; başkentini kur, limanlarla ticaret yap, gizli taktiklerle savaş ve hanedanını yaşat.

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

## Oynanış

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

