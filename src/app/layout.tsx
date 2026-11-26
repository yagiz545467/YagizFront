import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
export const metadata:Metadata={title:'YağızFront — Son hanedan',description:'Arkadaşlarınla aynı haritada. Sıra tabanlı savaş, ticaret ve hanedan stratejisi.',applicationName:'YağızFront'};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#191f1d'};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="tr" className={GeistSans.variable}><body>{children}</body></html>; }
