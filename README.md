# Elections 2025 DApp

A decentralized voting application (DApp) built with Solidity, Hardhat, and React.
It supports an admin GUI, a Merkle-tree voter book anchored on-chain with a mock IPFS CID,
a timed voting window, direct and anonymous questionnaire-based voting, automatic ERC20
reward payouts, and a soulbound "I Voted" receipt.

## Features

- Admin GUI (React) for all election operations.
- Add candidates, each with a 3-topic questionnaire position (scale 1-5).
- Voter book stored as a Merkle tree; the root and a mock IPFS CID are stored in the contract.
- Voting window with a specific future start and end time, enforced on-chain, plus a live countdown.
- Winner and full sorted ranking shown when voting ends.
- ERC20 reward token: name `OfirBal Token`, symbol `BAL`, auto-minted to each voter.
- Anonymous matching: a voter can answer the same questionnaire and the contract votes for the
  closest-matching candidate (by absolute-difference distance) without revealing which one.
- Bonus: soulbound (non-transferable) "I Voted" NFT receipt minted to each voter and a live results dashboard.

## Project structure

```
contracts/       Election.sol, OfirBalToken.sol, VoteReceipt.sol
scripts/          deploy.js
frontend/         React + Vite app
deployments/      per-network deployment output
```

## Prerequisites

- Node.js 18+
- MetaMask browser extension

## Setup

```bash
npm install
```

## Compile

```bash
npm run compile
```

## Run locally

1. Start a local blockchain:

```bash
npm run node
```

2. In a second terminal, deploy the contracts (this generates `frontend/src/contracts.json` which the frontend requires):

```bash
npm run deploy:local
```

3. Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

5. Open the app, connect MetaMask (import a local account and add the Hardhat network,
   chain id 31337), and use the Admin tab to add candidates, set the voter book, and set the
   voting window. Voters use the Vote tab; results appear under the Results tab.

## How the pieces fit together

- `OfirBalToken` and `VoteReceipt` are deployed first, then `Election`. The deploy script sets
  the Election contract as the sole minter of both, so rewards and receipts can only be issued
  through a valid vote.
- The voter book is a Merkle tree of eligible addresses. Only the root and a mock IPFS CID are
  stored on-chain; the address list is managed by the admin through the UI and stored in browser
  localStorage. Each voter submits a Merkle proof when voting, verified by `MerkleProof.verify`.
- Anonymous voting is computed on-chain: the voter's 3 answers are compared to every candidate's
  stored positions and the nearest candidate receives the vote. Because a blockchain is public,
  this hides the choice from the voter (the UI never reveals it) rather than from external observers.

## Note on the token name

The reward token's full name is `OfirBal Token` (symbol `BAL`), which includes the submitter's
name as required by the assignment.
