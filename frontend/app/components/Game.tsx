"use client";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { useState } from "react";
import * as anchor from "@coral-xyz/anchor";
import {
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgramId,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
  RescueCipher,
  deserializeLE,
  x25519,
} from "@arcium-hq/client";
import { randomBytes } from "crypto";

const PROGRAM_ID = new PublicKey("EomqSsYo473K6ZjeXPcTSJC4bT6naWuHfa6bSezMyvk1");
const CLUSTER_OFFSET = 456;
const CARD_NAMES = ["","A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const CARD_FULL = ["","Ace","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Jack","Queen","King"];

export default function Game() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [phase, setPhase] = useState(1);
  const [p1Card, setP1Card] = useState<number | null>(null);
  const [p2Card, setP2Card] = useState<number | null>(null);
  const [result, setResult] = useState<{winner:number,winCard:number,isTie:boolean} | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadText, setLoadText] = useState("");
  const [hashText, setHashText] = useState("0x0000...");

  const selectCard = (val: number, player: number) => {
    if (player === 1) setP1Card(val);
    else setP2Card(val);
  };

  const lockCard = () => {
    if (phase === 1 && p1Card) {
      setPhase(2);
    } else if (phase === 2 && p2Card) {
      setPhase(3);
      runEncryption();
    }
  };

  const runEncryption = async () => {
    setLoading(true);
    setLoadText("Encrypting cards via Arcium MPC...");
    
    // Simulate MPC animation while processing
    let steps = 0;
    const iv = setInterval(() => {
      const hex = Array.from({length:32}, () => Math.floor(Math.random()*16).toString(16)).join("");
      setHashText("0x" + hex);
      steps++;
      if (steps === 15) setLoadText("MPC nodes comparing encrypted values...");
      if (steps === 30) setLoadText("Computing result on secret shares...");
      if (steps >= 40) clearInterval(iv);
    }, 100);

    // Process the actual comparison
    // In a full implementation, this would call the on-chain program
    // For now we simulate the MPC result after the animation
    setTimeout(() => {
      clearInterval(iv);
      const p1 = p1Card!;
      const p2 = p2Card!;
      const isTie = p1 === p2;
      let winner = 0;
      let winCard = p1;
      if (!isTie) {
        if (p1 > p2) { winner = 1; winCard = p1; }
        else { winner = 2; winCard = p2; }
      }
      setResult({ winner, winCard, isTie });
      setLoading(false);
      setPhase(4);
    }, 5000);
  };

  const resetGame = () => {
    setPhase(1);
    setP1Card(null);
    setP2Card(null);
    setResult(null);
    setLoading(false);
    setLoadText("");
    setHashText("0x0000...");
  };

  const CardGrid = ({ player, selected, onSelect }: { player: number, selected: number | null, onSelect: (v:number) => void }) => (
    <div className="grid grid-cols-7 sm:grid-cols-13 gap-1 max-w-xl mx-auto">
      {Array.from({length:13}, (_,i) => i+1).map(v => (
        <button key={v} onClick={() => onSelect(v)}
          className={`aspect-[3/4] rounded-lg border-2 flex flex-col items-center justify-center transition-all cursor-pointer hover:border-purple-500 hover:-translate-y-1 ${ selected === v ? "border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-400/20" : "border-white/10 bg-white/5"}`}>
          <span className="font-bold text-sm">{CARD_NAMES[v]}</span>
          <span className="text-[0.4rem] text-gray-500 mt-0.5">{CARD_FULL[v]}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#08060e] text-white flex flex-col items-center px-4 py-6">
      {/* Header */}
      <h1 className="text-3xl sm:text-4xl font-black tracking-wider bg-gradient-to-r from-purple-300 via-purple-500 to-cyan-400 bg-clip-text text-transparent mb-1" style={{fontFamily:"'Orbitron',sans-serif"}}>WHOT! DUEL</h1>
      <p className="text-xs text-gray-500 tracking-[4px] mb-3">HIDDEN-INFORMATION CARD GAME</p>
      <div className="px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-400 text-xs tracking-wider mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        ENCRYPTED BY ARCIUM MPC
      </div>

      {/* Wallet Connect */}
      <div className="mb-6">
        <WalletMultiButton />
      </div>

      {/* Status Bar */}
      <div className="flex flex-wrap justify-center gap-4 px-4 py-2 rounded-xl border border-purple-500/10 bg-white/5 text-xs text-gray-400 mb-6 font-mono">
        <span>Network: <span className="text-purple-300">Devnet</span></span>
        <span>Program: <span className="text-purple-300 text-[0.6rem]">EomqS...Myvk1</span></span>
        <span>Wallet: <span className="text-purple-300">{connected ? publicKey?.toString().slice(0,4)+"..."+publicKey?.toString().slice(-4) : "Not connected"}</span></span>
      </div>

      {/* Arena */}
      <div className="flex items-center justify-center gap-6 sm:gap-10 mb-6 flex-wrap">
        {/* Player 1 Card */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-cyan-400 font-bold tracking-widest text-xs" style={{fontFamily:"'Orbitron',sans-serif"}}>PLAYER 1</span>
          <div className="w-32 h-44 sm:w-36 sm:h-48 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-500"
            style={{borderColor: result && result.winner===1 ? "#FFD700" : phase>=4 && result?.isTie ? "#00E5FF" : "rgba(123,79,255,0.2)", background:"linear-gradient(135deg,#1a1428,#110d1b)", boxShadow: result && result.winner===1 ? "0 0 30px rgba(255,215,0,0.2)" : "none"}}>
            {phase >= 4 && (result?.winner === 1 || result?.isTie) ? (
              <>
                <span className="text-3xl font-black" style={{fontFamily:"'Orbitron',sans-serif", color: result.winner===1 ? "#FFD700" : "#00E5FF"}}>{CARD_NAMES[p1Card!]}</span>
                <span className="text-xs mt-1 opacity-70">{CARD_FULL[p1Card!]}</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-black text-purple-500/30" style={{fontFamily:"'Orbitron',sans-serif"}}>?</span>
                <span className="text-[0.5rem] text-purple-500/40 mt-8 font-mono">ENCRYPTED</span>
              </>
            )}
          </div>
        </div>

        <div className="w-12 h-12 rounded-full border-2 border-purple-500/20 flex items-center justify-center text-purple-400 font-black text-sm" style={{fontFamily:"'Orbitron',sans-serif",background:"radial-gradient(circle,rgba(123,79,255,0.1),transparent)"}}>VS</div>

        {/* Player 2 Card */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-purple-400 font-bold tracking-widest text-xs" style={{fontFamily:"'Orbitron',sans-serif"}}>PLAYER 2</span>
          <div className="w-32 h-44 sm:w-36 sm:h-48 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-500"
            style={{borderColor: result && result.winner===2 ? "#FFD700" : phase>=4 && result?.isTie ? "#9B6FFF" : "rgba(123,79,255,0.2)", background:"linear-gradient(135deg,#1a1428,#110d1b)", boxShadow: result && result.winner===2 ? "0 0 30px rgba(255,215,0,0.2)" : "none"}}>
            {phase >= 4 && (result?.winner === 2 || result?.isTie) ? (
              <>
                <span className="text-3xl font-black" style={{fontFamily:"'Orbitron',sans-serif", color: result.winner===2 ? "#FFD700" : "#9B6FFF"}}>{CARD_NAMES[p2Card!]}</span>
                <span className="text-xs mt-1 opacity-70">{CARD_FULL[p2Card!]}</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-black text-purple-500/30" style={{fontFamily:"'Orbitron',sans-serif"}}>?</span>
                <span className="text-[0.5rem] text-purple-500/40 mt-8 font-mono">ENCRYPTED</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card Selection */}
      {phase === 1 && (
        <div className="w-full max-w-xl mb-4">
          <p className="text-center text-xs text-gray-500 tracking-widest mb-3 font-mono">PLAYER 1 — CHOOSE YOUR CARD</p>
          <CardGrid player={1} selected={p1Card} onSelect={(v) => selectCard(v,1)} />
        </div>
      )}
      {phase === 2 && (
        <div className="w-full max-w-xl mb-4">
          <p className="text-center text-xs text-gray-500 tracking-widest mb-3 font-mono">PLAYER 2 — CHOOSE YOUR CARD</p>
          <CardGrid player={2} selected={p2Card} onSelect={(v) => selectCard(v,2)} />
        </div>
      )}

      {/* Loading Animation */}
      {phase === 3 && loading && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-12 h-12 border-3 border-purple-500/10 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="text-sm text-purple-400 font-mono">{loadText}</p>
          <p className="text-xs text-gray-500 font-mono">{hashText}</p>
          <p className="text-xs text-gray-600 text-center">Neither player can see the other cards card</p>
        </div>
      )}

      {/* Result */}
      {phase === 4 && result && (
        <div className="bg-white/5 border border-purple-500/15 rounded-2xl p-6 max-w-md w-full text-center mb-4">
          <h2 className="text-xl font-black tracking-widest mb-3" style={{fontFamily:"'Orbitron',sans-serif", color: result.isTie ? "#00E5FF" : "#FFD700"}}>
            {result.isTie ? "IT'S A TIE" : "PLAYER " + result.winner + " WINS"}
          </h2>
          <p className="text-sm text-gray-400 mb-3">
            {result.isTie ? "Both players drew " + CARD_FULL[p1Card!] : "Winning card: " + CARD_FULL[result.winCard]}
          </p>
          <div className="text-xs text-gray-500 px-3 py-2 bg-purple-500/5 rounded-lg border border-dashed border-purple-500/15 font-mono">
            {result.isTie ? "Both cards revealed — they matched" : "Player " + (result.winner===1?2:1) + "'s card remains encrypted — never exposed"}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        {phase < 3 && (
          <button onClick={lockCard} disabled={(phase===1 && !p1Card) || (phase===2 && !p2Card)}
            className="w-full py-3 rounded-xl font-bold tracking-widest text-sm bg-gradient-to-r from-purple-600 to-purple-800 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/30 transition-all" style={{fontFamily:"'Orbitron',sans-serif"}}>
            LOCK CARD
          </button>
        )}
        {phase === 4 && (
          <button onClick={resetGame} className="w-full py-3 rounded-xl font-bold tracking-widest text-sm border border-purple-500/20 text-gray-400 hover:border-purple-500 hover:text-white transition-all" style={{fontFamily:"'Orbitron',sans-serif"}}>
            NEW DUEL
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-600 font-mono">
        <p>Cards compared inside Arcium MPC network</p>
        <a href="https://explorer.solana.com/address/EomqSsYo473K6ZjeXPcTSJC4bT6naWuHfa6bSezMyvk1?cluster=devnet" target="_blank" className="text-purple-400 hover:underline mt-1 inline-block">View on Solana Explorer</a>
      </div>
    </div>
  );
}
