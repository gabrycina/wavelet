import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import "./globals.css";

// Option 1: JetBrains Mono - techy, monospace
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains'
})

// Option 2: Space Grotesk - modern, scientific
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space'
})

export const metadata: Metadata = {
  title: "Wavelet | EEG Analysis Platform",
  description: "Enabling 1000x brain applications and research through EEG to MEG transform",
  icons: {
    icon: [{ url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌊</text></svg>" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
