'use client';
export default function ErrorPage({reset}:{reset:()=>void}) { return <main className="fallback"><h1>Bağlantıyı yeniden kuralım.</h1><p>Oyun kaydın sunucuda korunuyor. Ekranı tekrar yükleyebilirsin.</p><button onClick={reset}>Tekrar dene</button></main>; }
