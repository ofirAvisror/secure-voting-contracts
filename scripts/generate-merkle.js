const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { buildTree, getRoot, mockCid } = require("./lib/merkle");

async function loadVoters() {
  const votersPath = path.join(__dirname, "..", "voters.json");
  if (fs.existsSync(votersPath)) {
    const raw = JSON.parse(fs.readFileSync(votersPath, "utf8"));
    return Array.isArray(raw) ? raw : raw.addresses;
  }
  const signers = await hre.ethers.getSigners();
  return signers.slice(0, 5).map((s) => s.address);
}

async function main() {
  const addresses = await loadVoters();
  const normalized = addresses.map((a) => hre.ethers.getAddress(a));

  const tree = buildTree(normalized);
  const merkleRoot = getRoot(tree);

  const bookForCid = { addresses: normalized, merkleRoot };
  const cid = mockCid(bookForCid);

  const outDir = path.join(__dirname, "..", "ipfs-mock");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const voterBook = {
    addresses: normalized,
    merkleRoot,
    cid,
    createdAt: new Date().toISOString()
  };
  const outPath = path.join(outDir, cid + ".json");
  fs.writeFileSync(outPath, JSON.stringify(voterBook, null, 2));

  console.log("Voter book written to:", outPath);
  console.log("Addresses:", normalized.length);
  console.log("Merkle root:", merkleRoot);
  console.log("Mock IPFS CID:", cid);
  console.log("");
  console.log("Call on Election contract: setVoterBook(merkleRoot, cid)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
