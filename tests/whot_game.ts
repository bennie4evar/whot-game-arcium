import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { WhotGame } from "../target/types/whot_game";
import { randomBytes } from "crypto";
import {
  awaitComputationFinalization,
  getArciumEnv,
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgramId,
  getArciumProgram,
  uploadCircuit,
  RescueCipher,
  deserializeLE,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
  getLookupTableAddress,
  x25519,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";
import { expect } from "chai";

describe("WhotGame - Hidden Card Duel", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.WhotGame as Program<WhotGame>;
  const provider = anchor.getProvider();
  const arciumProgram = getArciumProgram(provider as anchor.AnchorProvider);

  type Event = anchor.IdlEvents<(typeof program)["idl"]>;
  const awaitEvent = async <E extends keyof Event>(
    eventName: E,
  ): Promise<Event[E]> => {
    let listenerId: number;
    const event = await new Promise<Event[E]>((res) => {
      listenerId = program.addEventListener(eventName, (event) => {
        res(event);
      });
    });
    await program.removeEventListener(listenerId);
    return event;
  };

  const arciumEnv = getArciumEnv();
  const clusterAccount = getClusterAccAddress(arciumEnv.arciumClusterOffset);

  const cardNames = [
    "", "Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King"
  ];

  it("Player 1 wins with a higher card", async () => {
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

    console.log("Initializing compare_cards computation definition");
    const initSig = await initCompareCardsCompDef(program, owner);
    console.log("Computation definition initialized:", initSig);

    const mxePublicKey = await getMXEPublicKeyWithRetry(
      provider as anchor.AnchorProvider,
      program.programId,
    );

    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    // Player 1 plays King (13), Player 2 plays 7
    const player1Card = BigInt(13);
    const player2Card = BigInt(7);
    console.log(`\nPlayer 1 plays: ${cardNames[Number(player1Card)]} (secret)`);
    console.log(`Player 2 plays: ${cardNames[Number(player2Card)]} (secret)`);
    console.log("Both cards are encrypted - no one can see the other's card...\n");

    const nonce = randomBytes(16);
    const ciphertext = cipher.encrypt([player1Card, player2Card], nonce);

    const gameResultPromise = awaitEvent("gameResultEvent");
    const computationOffset = new anchor.BN(randomBytes(8), "hex");

    const queueSig = await program.methods
      .compareCards(
        computationOffset,
        Array.from(ciphertext[0]),
        Array.from(ciphertext[1]),
        Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString()),
      )
      .accountsPartial({
        computationAccount: getComputationAccAddress(
          arciumEnv.arciumClusterOffset,
          computationOffset,
        ),
        clusterAccount,
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
        executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
        compDefAccount: getCompDefAccAddress(
          program.programId,
          Buffer.from(getCompDefAccOffset("compare_cards")).readUInt32LE(),
        ),
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    console.log("Computation queued:", queueSig);

    const finalizeSig = await awaitComputationFinalization(
      provider as anchor.AnchorProvider,
      computationOffset,
      program.programId,
      "confirmed",
    );
    console.log("Computation finalized:", finalizeSig);

    const gameResult = await gameResultPromise;
    const decryptedWinner = cipher.decrypt([gameResult.winner], new Uint8Array(gameResult.nonce))[0];
    const decryptedCard = cipher.decrypt([gameResult.revealedCard], new Uint8Array(gameResult.nonce))[0];
    const decryptedIsTie = cipher.decrypt([gameResult.isTie], new Uint8Array(gameResult.nonce))[0];

    console.log("\n--- GAME RESULT ---");
    if (decryptedIsTie === BigInt(1)) {
      console.log("It's a TIE!");
    } else if (decryptedWinner === BigInt(1)) {
      console.log(`Player 1 WINS with ${cardNames[Number(decryptedCard)]}!`);
      console.log("Player 2's card remains hidden.");
    } else {
      console.log(`Player 2 WINS with ${cardNames[Number(decryptedCard)]}!`);
      console.log("Player 1's card remains hidden.");
    }
    console.log("-------------------\n");

    expect(decryptedWinner).to.equal(BigInt(1));
    expect(decryptedCard).to.equal(player1Card);
  });

  async function initCompareCardsCompDef(
    program: Program<WhotGame>,
    owner: anchor.web3.Keypair,
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed(
      "ComputationDefinitionAccount",
    );
    const offset = getCompDefAccOffset("compare_cards");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgramId(),
    )[0];

    const mxeAccount = getMXEAccAddress(program.programId);
    const mxeAcc = await arciumProgram.account.mxeAccount.fetch(mxeAccount);
    const lutAddress = getLookupTableAddress(program.programId, mxeAcc.lutOffsetSlot);

    const sig = await program.methods
      .initCompareCardsCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount,
        addressLookupTable: lutAddress,
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });

    const rawCircuit = fs.readFileSync("build/compare_cards.arcis");
    await uploadCircuit(
      provider as anchor.AnchorProvider,
      "compare_cards",
      program.programId,
      rawCircuit,
      true,
      500,
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      },
    );

    return sig;
  }
});

async function getMXEPublicKeyWithRetry(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
  maxRetries: number = 20,
  retryDelayMs: number = 500,
): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const mxePublicKey = await getMXEPublicKey(provider, programId);
      if (mxePublicKey) return mxePublicKey;
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error);
    }
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
  throw new Error(`Failed to fetch MXE public key after ${maxRetries} attempts`);
}

function readKpJson(path: string): anchor.web3.Keypair {
  const file = fs.readFileSync(path);
  return anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(file.toString())),
  );
}
