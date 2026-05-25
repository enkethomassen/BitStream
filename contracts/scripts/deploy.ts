import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MUSDVault with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy with deployer as initial executor (backend agent address can be updated later)
  const MUSDVault = await ethers.getContractFactory("MUSDVault");
  const vault = await MUSDVault.deploy(deployer.address);
  await vault.waitForDeployment();

  const address = await vault.getAddress();
  console.log("✅ MUSDVault deployed to:", address);
  console.log("   Executor set to:", deployer.address);
  console.log("\nAdd to .env:");
  console.log(`VAULT_CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
