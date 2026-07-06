const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const owner = deployer.address;
  const rewardAmount = hre.ethers.parseUnits("10", 18);

  console.log("Deploying with account:", owner);

  const Token = await hre.ethers.getContractFactory("OfirBalToken");
  const token = await Token.deploy(owner);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  const Receipt = await hre.ethers.getContractFactory("VoteReceipt");
  const receipt = await Receipt.deploy(owner);
  await receipt.waitForDeployment();
  const receiptAddress = await receipt.getAddress();

  const Election = await hre.ethers.getContractFactory("Election");
  const election = await Election.deploy(
    tokenAddress,
    receiptAddress,
    rewardAmount,
    owner,
  );
  await election.waitForDeployment();
  const electionAddress = await election.getAddress();

  await (await token.setMinter(electionAddress)).wait();
  await (await receipt.setMinter(electionAddress)).wait();

  console.log("OfirBalToken:", tokenAddress);
  console.log("VoteReceipt: ", receiptAddress);
  console.log("Election:    ", electionAddress);

  const artifact = await hre.artifacts.readArtifact("Election");
  const tokenArtifact = await hre.artifacts.readArtifact("OfirBalToken");
  const receiptArtifact = await hre.artifacts.readArtifact("VoteReceipt");

  const deployment = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    rewardAmount: rewardAmount.toString(),
    addresses: {
      OfirBalToken: tokenAddress,
      VoteReceipt: receiptAddress,
      Election: electionAddress,
    },
    abis: {
      Election: artifact.abi,
      OfirBalToken: tokenArtifact.abi,
      VoteReceipt: receiptArtifact.abi,
    },
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(deploymentsDir, hre.network.name + ".json"),
    JSON.stringify(deployment, null, 2),
  );

  const frontendDir = path.join(__dirname, "..", "frontend", "src");
  if (fs.existsSync(frontendDir)) {
    fs.writeFileSync(
      path.join(frontendDir, "contracts.json"),
      JSON.stringify(deployment, null, 2),
    );
    console.log("Frontend contracts.json updated");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
