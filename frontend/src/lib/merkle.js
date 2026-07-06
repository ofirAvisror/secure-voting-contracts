import { ethers } from "ethers";

export function leafFor(address) {
  return ethers.solidityPackedKeccak256(["address"], [address]);
}

function hashPair(a, b) {
  const [x, y] = BigInt(a) <= BigInt(b) ? [a, b] : [b, a];
  return ethers.keccak256(ethers.concat([x, y]));
}

function buildLayers(leaves) {
  const layers = [leaves];
  let current = leaves;
  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      if (i + 1 < current.length) {
        next.push(hashPair(current[i], current[i + 1]));
      } else {
        next.push(current[i]);
      }
    }
    layers.push(next);
    current = next;
  }
  return layers;
}

export function computeRoot(addresses) {
  const leaves = addresses.map(leafFor);
  const layers = buildLayers(leaves);
  return layers[layers.length - 1][0];
}

export function computeProof(addresses, address) {
  const leaves = addresses.map(leafFor);
  const layers = buildLayers(leaves);
  const target = leafFor(address);
  let index = leaves.findIndex((l) => l.toLowerCase() === target.toLowerCase());
  if (index === -1) {
    return null;
  }
  const proof = [];
  for (let level = 0; level < layers.length - 1; level++) {
    const layer = layers[level];
    const isRight = index % 2 === 1;
    const pairIndex = isRight ? index - 1 : index + 1;
    if (pairIndex < layer.length) {
      proof.push(layer[pairIndex]);
    }
    index = Math.floor(index / 2);
  }
  return proof;
}

export function mockCid(payload) {
  const json = JSON.stringify(payload);
  const hash = ethers.keccak256(ethers.toUtf8Bytes(json)).slice(2);
  return "bafkmock" + hash.slice(0, 46);
}
