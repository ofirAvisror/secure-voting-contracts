import { ethers } from "ethers";
import deployment from "../contracts.json";

export function isConfigured() {
  return Boolean(deployment.addresses && deployment.addresses.Election);
}

export function getDeployment() {
  return deployment;
}

export function getExpectedChainId() {
  return Number(deployment.chainId);
}

const CHAIN_METADATA = {
  11155111: {
    chainId: "0xaa36a7",
    chainName: "Sepolia",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://rpc.sepolia.org"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"]
  },
  31337: {
    chainId: "0x7a69",
    chainName: "Hardhat Local",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["http://127.0.0.1:8545"],
    blockExplorerUrls: []
  }
};

export async function switchNetwork() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found.");
  }
  const target = CHAIN_METADATA[getExpectedChainId()];
  if (!target) {
    throw new Error("Unknown target network.");
  }
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: target.chainId }]
    });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [target]
      });
    } else {
      throw err;
    }
  }
}

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Please install it.");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const account = await signer.getAddress();
  const network = await provider.getNetwork();
  return { provider, signer, account, chainId: Number(network.chainId) };
}

export function getElection(signerOrProvider) {
  return new ethers.Contract(
    deployment.addresses.Election,
    deployment.abis.Election,
    signerOrProvider
  );
}

export function getToken(signerOrProvider) {
  return new ethers.Contract(
    deployment.addresses.OfirBalToken,
    deployment.abis.OfirBalToken,
    signerOrProvider
  );
}

export function getReceipt(signerOrProvider) {
  return new ethers.Contract(
    deployment.addresses.VoteReceipt,
    deployment.abis.VoteReceipt,
    signerOrProvider
  );
}
