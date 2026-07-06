# Full Project Explanation — Elections 2025 DApp

This document explains every part of the project: what it does, how the pieces connect, and the end-to-end workflow. It complements `README.md` (which is more concise).

---

## 1. What is this project?

A decentralized voting application (DApp) for elections. All the voting logic, eligibility, and results run **on the blockchain** (Solidity smart contracts), with a client-side UI (React) that talks to the contracts through MetaMask.

The core idea: transparent, tamper-proof voting where:

- Only pre-approved addresses (the "voter book") can vote.
- Each voter can vote exactly once.
- Voting is only open during a defined time window.
- Everyone who votes automatically receives an ERC20 reward token and a non-transferable digital receipt (NFT).

---

## 2. The three smart contracts (`contracts/`)

### 2.1 `OfirBalToken.sol` — the reward token (ERC20)

- An ERC20 token named **`OfirBal Token`** with symbol **`BAL`** (the name includes the submitter's name as required by the assignment).
- Only one authorized address (`minter`) can create new tokens. The owner sets the minter via `setMinter`.
- On deployment, the `minter` is set to be the **Election contract**, so tokens can only be minted through a valid vote.

### 2.2 `VoteReceipt.sol` — the "I Voted" receipt (ERC721 / NFT)

- An NFT named `I Voted Receipt` (symbol `IVOTED`) minted to every voter.
- **Soulbound** — it cannot be transferred. This is enforced in the `_update` function: only minting (from the zero address) or burning (to the zero address) are allowed, but not transfers between wallets. A transfer attempt reverts with `Receipt: soulbound`.
- Here too, only the `minter` (the Election contract) can mint.

### 2.3 `Election.sol` — the heart of the system

This is the main contract that manages the entire election process. It inherits from `Ownable` (has an owner/admin).

**State stored on-chain:**

- `candidates` — an array of candidates. Each candidate has: a name, an array of 3 questionnaire positions (`positions`, each on a 1–5 scale), and a vote counter.
- `voterMerkleRoot` — the Merkle tree root of the voter book (see section 4).
- `voterBookCid` — a mock IPFS CID pointing to the address list file.
- `votingStart` / `votingEnd` — the voting time window (timestamps).
- `hasVoted` — a mapping that prevents double voting.
- References to `rewardToken` and `voteReceipt`, plus the reward amount `rewardAmount`.

**Admin operations (owner only):**

- `addCandidate(name, positions)` — adds a candidate. Validates each position is in the 1–5 range, and that voting hasn't started yet.
- `setVoterBook(merkleRoot, cid)` — sets the Merkle root and CID of the voter book.
- `setVotingWindow(start, end)` — sets the voting window (requires `start < end` and `end` in the future).

**Voting operations (any eligible voter):**

- `voteDirect(candidateId, proof)` — a direct vote for a specific candidate.
- `voteByPreference(answers, proof)` — an anonymous vote: the voter answers the same questionnaire (3 answers on a 1–5 scale), and the contract picks the **nearest** candidate by distance (the sum of absolute differences between the answers and the candidate's positions). This hides the choice from the voter — the UI never reveals who was selected.

Both functions go through `_checkEligibility`, which verifies:

1. Voting is currently open (`votingOpen`).
2. The address hasn't already voted.
3. A voter book is configured.
4. The Merkle proof is valid — i.e. `keccak256(address)` is part of the tree built from the root.

After verification, `_castVote` marks the voter, updates counters, mints the BAL reward and the NFT receipt, and emits a `Voted` event.

**Read functions for results:**

- `getCandidates` — all names and votes.
- `getResultsSorted` — a ranking sorted from the winner downward (simple bubble sort).
- `getWinner` — the single winner.

---

## 3. The scripts (`scripts/`)

### 3.1 `deploy.js` — deploying the contracts

1. Deploys in order: `OfirBalToken` → `VoteReceipt` → `Election`.
2. Sets the Election contract as the sole `minter` of the token and the receipt (so rewards and receipts can only be issued through a valid vote).
3. Default reward amount: 10 BAL per voter.
4. Writes a deployment file to `deployments/<network>.json` **and** to `frontend/src/contracts.json` — including addresses and ABIs, so the frontend immediately knows what to talk to.

---

## 4. How the voter book works (Merkle Tree)

Instead of storing a long list of addresses on-chain (expensive in gas), only a single Merkle tree **root** is stored. The full address list is entered by the admin through the UI and saved in browser localStorage.

When a voter wants to vote, the frontend computes a **Merkle proof** for them (the path of hashes from their leaf up to the root) and sends it to the contract. The contract runs `MerkleProof.verify` and confirms the address really is part of the voter book — without the contract holding the entire list.

Important: the client-side Merkle implementation (`frontend/src/lib/merkle.js`) must exactly match the contract implementation — the same leaf type (`keccak256(address)`) and the same pair-sorting method.

---

## 5. The frontend (`frontend/`)

A React + Vite app. Key points:

- **`src/contracts.json`** — auto-generated by the deploy script; contains addresses and ABIs. The frontend reads everything from it.
- **`src/lib/eth.js`** — MetaMask connection (`connectWallet`), creating contract objects (`getElection`/`getToken`/`getReceipt`), detecting the correct network and switching networks (`switchNetwork`).
- **`src/lib/merkle.js`** — computing the root and proofs on the client side.
- **`src/lib/topics.js`** — defines the 3 questionnaire topics (Economy, Environment, Security) and the 1–5 scale.
- **`src/App.jsx`** — the main shell: connects the wallet, detects whether the user is the owner (shows the Admin tab), navigates between tabs, and warns about the wrong network.

**The three screens (components):**

- **`AdminPanel.jsx`** (admin only) — adds candidates (with sliders for positions), enters the voter list and builds the Merkle tree, and sets the voting window.
- **`VoterPanel.jsx`** — the voting screen: choose between a direct vote and an anonymous questionnaire, shows BAL balance and receipts, and a countdown. Computes the proof before submitting.
- **`Results.jsx`** — live ranking (refreshes every 5 seconds) with a bar chart, total votes, and the winner once voting ends.
- **`Countdown.jsx`** — a countdown component for the voting window.

---

## 6. End-to-end workflow (running locally)

```bash
# 1. Install dependencies
npm install

# 2. Start a local blockchain (separate terminal)
npm run node

# 3. Deploy the contracts (also writes frontend/src/contracts.json)
npm run deploy:local

# 4. Start the frontend
cd frontend
npm install
npm run dev
```

Then, in the browser:

1. Connect MetaMask with the Hardhat network (RPC `http://127.0.0.1:8545`, chain id `31337`) and import a local account.
2. In the **Admin** tab: add candidates, set the voter book (paste in the eligible addresses), and set the voting window.
3. Voters use the **Vote** tab; results appear in the **Results** tab.

---

## 7. Deploying to Sepolia (a real testnet)

1. Fill in `.env` with `SEPOLIA_RPC_URL` and `PRIVATE_KEY` (⚠️ never commit `.env` — it's already in `.gitignore`).
2. `npm run deploy:sepolia`.
3. Rebuild/serve the frontend; `contracts.json` will be updated with the Sepolia addresses.

The configuration is in `hardhat.config.js` (Solidity 0.8.28, optimizer enabled, evmVersion `cancun`).

---

## 8. Directory structure at a glance

```
contracts/    Election.sol, OfirBalToken.sol, VoteReceipt.sol   ← the smart contracts
scripts/      deploy.js                                          ← deployment
frontend/     React + Vite app                                   ← the user interface
deployments/  deployment output per network                     ← generated at runtime
hardhat.config.js   Hardhat and network configuration
```

---

## 10. Key security and design points

- **Single minting source:** only the Election contract can mint BAL and receipts — there's no way to get a reward without a valid vote.
- **Eligibility without an on-chain list:** a Merkle proof lets you verify eligibility without storing all addresses (saving gas and providing partial privacy).
- **Anonymity from the voter:** in a questionnaire vote, the UI doesn't reveal who was selected. However, because the blockchain is public, an external observer can compute it — the anonymity is toward the voter, not toward the world.
- **Time-window and single-vote enforcement** happen on-chain and cannot be bypassed from the frontend.
