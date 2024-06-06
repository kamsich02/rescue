import { providers, Wallet, ethers } from "ethers";
import { formatEther } from "ethers/lib/utils.js";
import { gasPriceToGwei } from "./utils.js";

import "log-timestamp";
import "dotenv/config";

const NETWORK_RPC_URL = process.env.NETWORK_RPC_URL;
const PRIVATE_KEY_ZERO_GAS = process.env.PRIVATE_KEY_ZERO_GAS || "";
const RECIEVER = process.env.RECIEVER || "";
const GAS_LIMIT = parseInt(process.env.GAS_LIMIT) || 21000;
const GAS_PRICE_GWEI = parseInt(process.env.GAS_PRICE_GWEI) || 35;
const GAS_PRICE = ethers.utils.parseUnits(GAS_PRICE_GWEI.toString(), 'gwei');

if (!NETWORK_RPC_URL || !PRIVATE_KEY_ZERO_GAS || !RECIEVER) {
  console.warn("Must provide NETWORK_RPC_URL, PRIVATE_KEY_ZERO_GAS, and RECIEVER environment variables.");
  process.exit(1);
}

const provider = new providers.JsonRpcProvider(NETWORK_RPC_URL);
const walletZeroGas = new Wallet(PRIVATE_KEY_ZERO_GAS, provider);

console.log(`Zero Gas Account: ${walletZeroGas.address}`);

async function send(wallet) {
  const balance = await wallet.getBalance();
  if (balance.isZero()) {
    console.log(`Balance is zero`);
    return;
  }

  const gasCost = GAS_LIMIT * GAS_PRICE;

  if (balance.lte(gasCost)) {
    console.log(
      `Balance too low to send (balance=${formatEther(balance)} ETH, gasPrice=${gasPriceToGwei(GAS_PRICE)} gwei)`
    );
    return;
  }

  const toSend = balance.sub(gasCost);

  try {
    console.log(`Sending ${formatEther(toSend)} ETH`);
    const tx = await wallet.sendTransaction({
      to: RECIEVER,
      value: toSend,
      gasLimit: GAS_LIMIT,
      gasPrice: GAS_PRICE,
    });
    console.log(
      `Sent tx with nonce ${tx.nonce} sending ${formatEther(
        toSend
      )} ETH at gas price ${gasPriceToGwei(GAS_PRICE)} gwei: ${tx.hash}`
    );
  } catch (err) {
    console.log(`Error sending tx: ${err.message ?? err}`);
  }
}

async function main() {
  console.log(`Connected to ${NETWORK_RPC_URL}`);
  provider.on("block", async (blockNumber) => {
    console.log(`New block ${blockNumber}`);
    await send(walletZeroGas);
  });
}

main();
