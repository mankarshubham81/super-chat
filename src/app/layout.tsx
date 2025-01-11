import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Super Private Chat - Secure and Instant Messaging",
  description: "Join private chat rooms instantly. No sign-up or login required. Start chatting securely in just a few seconds.",
  keywords: "private chat, secure messaging, instant chat, no sign-up chat, online communication",
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "./chat-super-logo.webp",
  },
  openGraph: {
    title: "Super Private Chat - Secure and Instant Messaging",
    description: "Join private chat rooms instantly. No sign-up or login required. Start chatting securely in just a few seconds.",
    url: "https://chat-super.vercel.app",
    type: "website",
    images: [
      {
        url: "./chat-super-logo.webp",
        width: 1200,
        height: 630,
        alt: "Super Private Chat",
      },
    ],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

