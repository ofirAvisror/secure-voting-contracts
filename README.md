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
- ERC20 reward token: name `OfirOr Token`, symbol `OFO`, auto-minted to each voter.
- Anonymous matching: a voter can answer the same questionnaire and the contract votes for the
  closest-matching candidate (by absolute-difference distance) without revealing which one.
- Bonus: soulbound (non-transferable) "I Voted" NFT receipt minted to each voter and a live results dashboard.

## Project structure

```
contracts/       Election.sol, OfirOrToken.sol, VoteReceipt.sol
scripts/          deploy.js, generate-merkle.js, lib/merkle.js
frontend/         React + Vite app
ipfs-mock/        generated voter-book JSON files (mock IPFS)
deployments/      per-network deployment output
```

## Prerequisites

- Node.js 18+
- MetaMask browser extension

## Setup

```bash
npm install
cp .env.example .env   # only needed for Sepolia
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

2. In a second terminal, deploy the contracts (this also writes `frontend/src/contracts.json`):

```bash
npm run deploy:local
```

3. Generate a voter book Merkle tree (uses the first 5 local accounts by default, or a
   root-level `voters.json` file if present). It writes the voter book to `ipfs-mock/` and
   prints the Merkle root and mock CID:

```bash
npm run merkle -- --network localhost
```

4. Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

5. Open the app, connect MetaMask (import a local account and add the Hardhat network,
   chain id 31337), and use the Admin tab to add candidates, set the voter book, and set the
   voting window. Voters use the Vote tab; results appear under the Results tab.

## Deploy to Sepolia

1. Fill in `.env` with `SEPOLIA_RPC_URL` and `PRIVATE_KEY`.
2. Deploy:

```bash
npm run deploy:sepolia
```

3. Rebuild/serve the frontend; `frontend/src/contracts.json` is updated with the Sepolia addresses.

## How the pieces fit together

- `OfirOrToken` and `VoteReceipt` are deployed first, then `Election`. The deploy script sets
  the Election contract as the sole minter of both, so rewards and receipts can only be issued
  through a valid vote.
- The voter book is a Merkle tree of eligible addresses. Only the root and a mock IPFS CID are
  stored on-chain; the address list lives in the `ipfs-mock/` JSON file and in browser storage.
  Each voter submits a Merkle proof when voting, verified by `MerkleProof.verify`.
- Anonymous voting is computed on-chain: the voter's 3 answers are compared to every candidate's
  stored positions and the nearest candidate receives the vote. Because a blockchain is public,
  this hides the choice from the voter (the UI never reveals it) rather than from external observers.

## Note on the token name

The reward token's full name is `OfirOr Token` (symbol `OFO`), which includes the submitters'
names as required by the assignment.
