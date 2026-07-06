const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { buildTree, getRoot, getProof } = require("../scripts/lib/merkle");

const REWARD = ethers.parseUnits("10", 18);

async function deployFixture() {
  const [owner, v1, v2, v3, outsider] = await ethers.getSigners();

  const Token = await ethers.getContractFactory("OfirBalToken");
  const token = await Token.deploy(owner.address);

  const Receipt = await ethers.getContractFactory("VoteReceipt");
  const receipt = await Receipt.deploy(owner.address);

  const Election = await ethers.getContractFactory("Election");
  const election = await Election.deploy(
    await token.getAddress(),
    await receipt.getAddress(),
    REWARD,
    owner.address
  );

  await token.setMinter(await election.getAddress());
  await receipt.setMinter(await election.getAddress());

  const voters = [v1.address, v2.address, v3.address];
  const tree = buildTree(voters);
  const root = getRoot(tree);

  return { owner, v1, v2, v3, outsider, token, receipt, election, tree, root };
}

async function openWindow(election) {
  const now = await time.latest();
  const start = now + 100;
  const end = start + 1000;
  await election.setVotingWindow(start, end);
  await time.increaseTo(start + 10);
  return { start, end };
}

async function addSampleCandidates(election) {
  await election.addCandidate("Alice", [1, 1, 1]);
  await election.addCandidate("Bob", [5, 5, 5]);
  await election.addCandidate("Carol", [3, 3, 3]);
}

describe("OfirBalToken", function () {
  it("has correct name and symbol", async function () {
    const { token } = await deployFixture();
    expect(await token.name()).to.equal("OfirBal Token");
    expect(await token.symbol()).to.equal("BAL");
  });

  it("only minter can mint", async function () {
    const { token, outsider } = await deployFixture();
    await expect(token.connect(outsider).mint(outsider.address, 1)).to.be.revertedWith(
      "OfirBal: not minter"
    );
  });
});

describe("Election admin", function () {
  it("only owner can add candidates", async function () {
    const { election, outsider } = await deployFixture();
    await expect(
      election.connect(outsider).addCandidate("X", [1, 2, 3])
    ).to.be.revertedWithCustomError(election, "OwnableUnauthorizedAccount");
  });

  it("rejects positions out of range", async function () {
    const { election } = await deployFixture();
    await expect(election.addCandidate("X", [0, 2, 3])).to.be.revertedWith(
      "Election: position out of range"
    );
    await expect(election.addCandidate("X", [1, 6, 3])).to.be.revertedWith(
      "Election: position out of range"
    );
  });

  it("stores voter book root and cid", async function () {
    const { election, root } = await deployFixture();
    await election.setVoterBook(root, "bafkmocktest");
    expect(await election.voterMerkleRoot()).to.equal(root);
    expect(await election.voterBookCid()).to.equal("bafkmocktest");
  });

  it("rejects bad voting windows", async function () {
    const { election } = await deployFixture();
    const now = await time.latest();
    await expect(election.setVotingWindow(now + 100, now + 50)).to.be.revertedWith(
      "Election: bad window"
    );
  });
});

describe("Direct voting", function () {
  it("counts a valid vote and mints reward + receipt", async function () {
    const { election, token, receipt, root, tree, v1 } = await deployFixture();
    await addSampleCandidates(election);
    await election.setVoterBook(root, "cid");
    await openWindow(election);

    const proof = getProof(tree, v1.address);
    await election.connect(v1).voteDirect(1, proof);

    const [, , voteCount] = await election.getCandidate(1);
    expect(voteCount).to.equal(1n);
    expect(await token.balanceOf(v1.address)).to.equal(REWARD);
    expect(await receipt.balanceOf(v1.address)).to.equal(1n);
    expect(await election.hasVoted(v1.address)).to.equal(true);
  });

  it("rejects an ineligible voter", async function () {
    const { election, root, tree, v1, outsider } = await deployFixture();
    await addSampleCandidates(election);
    await election.setVoterBook(root, "cid");
    await openWindow(election);

    const proof = getProof(tree, v1.address);
    await expect(election.connect(outsider).voteDirect(0, proof)).to.be.revertedWith(
      "Election: not eligible"
    );
  });

  it("rejects double voting", async function () {
    const { election, root, tree, v1 } = await deployFixture();
    await addSampleCandidates(election);
    await election.setVoterBook(root, "cid");
    await openWindow(election);

    const proof = getProof(tree, v1.address);
    await election.connect(v1).voteDirect(0, proof);
    await expect(election.connect(v1).voteDirect(0, proof)).to.be.revertedWith(
      "Election: already voted"
    );
  });

  it("rejects voting before window opens", async function () {
    const { election, root, tree, v1 } = await deployFixture();
    await addSampleCandidates(election);
    await election.setVoterBook(root, "cid");
    const now = await time.latest();
    await election.setVotingWindow(now + 1000, now + 2000);

    const proof = getProof(tree, v1.address);
    await expect(election.connect(v1).voteDirect(0, proof)).to.be.revertedWith(
      "Election: voting closed"
    );
  });

  it("rejects voting after window closes", async function () {
    const { election, root, tree, v1 } = await deployFixture();
    await addSampleCandidates(election);
    await election.setVoterBook(root, "cid");
    const { end } = await openWindow(election);
    await time.increaseTo(end + 10);

    const proof = getProof(tree, v1.address);
    await expect(election.connect(v1).voteDirect(0, proof)).to.be.revertedWith(
      "Election: voting closed"
    );
  });
});

describe("Anonymous preference voting", function () {
  it("picks the nearest candidate by position distance", async function () {
    const { election, root, tree, v1 } = await deployFixture();
    await addSampleCandidates(election);
    await election.setVoterBook(root, "cid");
    await openWindow(election);

    const proof = getProof(tree, v1.address);
    await election.connect(v1).voteByPreference([5, 4, 5], proof);

    const [, , bobVotes] = await election.getCandidate(1);
    const [, , aliceVotes] = await election.getCandidate(0);
    expect(bobVotes).to.equal(1n);
    expect(aliceVotes).to.equal(0n);
  });

  it("rejects answers out of range", async function () {
    const { election, root, tree, v1 } = await deployFixture();
    await addSampleCandidates(election);
    await election.setVoterBook(root, "cid");
    await openWindow(election);

    const proof = getProof(tree, v1.address);
    await expect(
      election.connect(v1).voteByPreference([9, 1, 1], proof)
    ).to.be.revertedWith("Election: answer out of range");
  });
});

describe("Soulbound receipt", function () {
  it("cannot be transferred", async function () {
    const { election, receipt, root, tree, v1, v2 } = await deployFixture();
    await addSampleCandidates(election);
    await election.setVoterBook(root, "cid");
    await openWindow(election);

    await election.connect(v1).voteDirect(0, getProof(tree, v1.address));
    await expect(
      receipt.connect(v1).transferFrom(v1.address, v2.address, 0)
    ).to.be.revertedWith("Receipt: soulbound");
  });
});

describe("Results", function () {
  it("returns sorted ranking and the winner", async function () {
    const { election, root, tree, v1, v2, v3 } = await deployFixture();
    await addSampleCandidates(election);
    await election.setVoterBook(root, "cid");
    await openWindow(election);

    await election.connect(v1).voteDirect(2, getProof(tree, v1.address));
    await election.connect(v2).voteDirect(2, getProof(tree, v2.address));
    await election.connect(v3).voteDirect(0, getProof(tree, v3.address));

    const [rankedIds, , votes] = await election.getResultsSorted();
    expect(rankedIds[0]).to.equal(2n);
    expect(votes[0]).to.equal(2n);

    const [winnerId, name, voteCount] = await election.getWinner();
    expect(winnerId).to.equal(2n);
    expect(name).to.equal("Carol");
    expect(voteCount).to.equal(2n);
  });
});
