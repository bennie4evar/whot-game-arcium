import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  getCompDefAccOffset,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
  awaitComputationFinalization,
  RescueCipher,
  deserializeLE,
  x25519,
} from "@arcium-hq/client";
import { randomBytes } from "crypto";
import idl from "../../idl/whot_game.json";

const PROGRAM_ID = new PublicKey("EomqSsYo473K6ZjeXPcTSJC4bT6naWuHfa6bSezMyvk1");
const CLUSTER_OFFSET = 456;

export async function POST(req: NextRequest) {
  try {
    const { p1Card, p2Card } = await req.json();
    
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    
    // Get MXE public key
    const tempWallet = Keypair.generate();
    const provider = new anchor.AnchorProvider(
      connection,
      { publicKey: tempWallet.publicKey, signTransaction: async (tx: any) => tx, signAllTransactions: async (txs: any) => txs } as any,
      { commitment: "confirmed" }
    );
    
    let mxePublicKey;
    for (let i = 0; i < 10; i++) {
      try {
        mxePublicKey = await getMXEPublicKey(provider, PROGRAM_ID);
        if (mxePublicKey) break;
      } catch(e) {}
      await new Promise(r => setTimeout(r, 500));
    }
    
    if (!mxePublicKey) {
      return NextResponse.json({ error: "Could not fetch MXE key" }, { status: 500 });
    }

    // Encrypt cards
    const privateKey = x25519.utils.randomSecretKey();
    const pubKey = x25519.getPublicKey(privateKey);
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);
    const nonce = randomBytes(16);
    const ciphertext = cipher.encrypt([BigInt(p1Card), BigInt(p2Card)], nonce);
    const computationOffset = new anchor.BN(randomBytes(8), "hex");
    const compDefOffset = Buffer.from(getCompDefAccOffset("compare_cards")).readUInt32LE();

    // Return the transaction data for the client to sign
    const program = new anchor.Program(idl as any, provider);
    
    const accounts = {
      computationAccount: getComputationAccAddress(CLUSTER_OFFSET, computationOffset).toString(),
      clusterAccount: getClusterAccAddress(CLUSTER_OFFSET).toString(),
      mxeAccount: getMXEAccAddress(PROGRAM_ID).toString(),
      mempoolAccount: getMempoolAccAddress(CLUSTER_OFFSET).toString(),
      executingPool: getExecutingPoolAccAddress(CLUSTER_OFFSET).toString(),
      compDefAccount: getCompDefAccAddress(PROGRAM_ID, compDefOffset).toString(),
    };

    return NextResponse.json({
      success: true,
      encryptionData: {
        ciphertext0: Array.from(ciphertext[0]),
        ciphertext1: Array.from(ciphertext[1]),
        pubkey: Array.from(pubKey),
        nonce: deserializeLE(nonce).toString(),
        computationOffset: computationOffset.toString("hex"),
        privateKey: Array.from(privateKey),
      },
      accounts,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
