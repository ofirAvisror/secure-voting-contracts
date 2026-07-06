const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const { ethers } = require("ethers");

function leafFor(address) {
  const packed = ethers.solidityPackedKeccak256(["address"], [address]);
  return Buffer.from(packed.slice(2), "hex");
}

function buildTree(addresses) {
  const leaves = addresses.map(leafFor);
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return tree;
}

function getRoot(tree) {
  return tree.getHexRoot();
}

function getProof(tree, address) {
  return tree.getHexProof(leafFor(address));
}

function mockCid(payload) {
  const json = JSON.stringify(payload);
  const hash = keccak256(Buffer.from(json)).toString("hex");
  return "bafkmock" + hash.slice(0, 46);
}

module.exports = { leafFor, buildTree, getRoot, getProof, mockCid };
