# Whot! Card Duel — Hidden-Information Game on Arcium

A two-player hidden-information card game built on Arcium's MPC network and Solana.

## What it does

Two players each play a secret card (1-13, representing Ace through King). Neither player can see the other's card. The Arcium MPC network compares the encrypted cards and reveals only the winner and their winning card — the loser's card remains permanently hidden.

This demonstrates Arcium's core capability: computing on encrypted data without any party seeing the raw inputs.

## How it works

1. **Player 1** encrypts their card using Arcium's Rescue cipher
2. **Player 2** encrypts their card the same way
3. Both encrypted cards are submitted to the Solana program
4. The program queues an MPC computation on Arcium's network
5. Arcium's MPC nodes compare the cards *while they remain encrypted*
6. Only the result (winner + winning card) is returned via callback
7. The losing card is never revealed to anyone

## Architecture

- **Arcis Circuit** (`encrypted-ixs/src/lib.rs`): The `compare_cards` function runs inside MPC — it receives two encrypted card values, compares them, and returns the winner without exposing the loser's card.
- **Solana Program** (`programs/whot_game/src/lib.rs`): On-chain coordinator that queues the encrypted computation and receives the callback with results.
- **TypeScript Client** (`tests/whot_game.ts`): Handles key exchange, encryption, transaction submission, and result decryption.

## Cultural Context

This game is inspired by **Whot!**, the most popular card game in West Africa (especially Nigeria), played by 200M+ people. While this implementation uses a simplified "higher card wins" mechanic, it demonstrates the hidden-information pattern that could power a full Whot! game where each player's hand remains private throughout gameplay.

## Deployed on Devnet

- **Program ID**: `EomqSsYo473K6ZjeXPcTSJC4bT6naWuHfa6bSezMyvk1`
- **Cluster Offset**: 456
- **Network**: Solana Devnet + Arcium Mainnet-Alpha

## Built With

- Arcium v0.9.7 (Arcis + arcium-anchor)
- Anchor 0.32.1
- Solana CLI 2.3.0
- TypeScript + @arcium-hq/client

## RTG Submission

This project targets the **Hidden-Information Games** developer bounty on Arcium RTG.
