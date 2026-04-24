import type { Metadata } from "next";
import "./globals.css";
import WalletContextProvider from "./components/WalletProvider";

export const metadata: Metadata = {
  title: "Whot! Duel - Arcium Hidden-Information Game",
  description: "Two-player hidden-information card game powered by Arcium MPC on Solana",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Sora:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <WalletContextProvider>{children}</WalletContextProvider>
      </body>
    </html>
  );
}
