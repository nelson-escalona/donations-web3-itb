import { network } from "hardhat";

async function main() {
  // Get a connection that includes the viem helpers
  const { viem } = await network.connect();

  // If your constructor had args, pass them as the 2nd param array.
  const deployed = await viem.deployContract("DonationsFactory", []);
  console.log("DonationsFactory deployed to:", deployed.address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
