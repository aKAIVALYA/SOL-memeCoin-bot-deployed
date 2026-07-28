import bs58 from "bs58";
import {
  Connection,
  Keypair,
  VersionedTransaction,
} from "@solana/web3.js";
import axios from "axios";
import { API_URLS } from "@raydium-io/raydium-sdk-v2";

const NATIVE_MINT = "So11111111111111111111111111111111111111112";
const slippage = 5;

export async function swap(tokenAddress: string, amount: number) {
  const rpcUrl = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is not configured");
  }

  const connection = new Connection(rpcUrl, "confirmed");
  const owner = Keypair.fromSecretKey(bs58.decode(privateKey));

  // 1. Get Priority Fee
  const { data: feeRes } = await axios.get<{
    id: string;
    success: boolean;
    data: { default: { vh: number; h: number; m: number } };
  }>(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`);

  const computeFee = feeRes?.data?.default?.h ? String(feeRes.data.default.h) : "100000";

  // 2. Compute Swap Route
  const { data: swapResponse } = await axios.get(
    `${API_URLS.SWAP_HOST}/compute/swap-base-in?inputMint=${NATIVE_MINT}&outputMint=${tokenAddress}&amount=${amount}&slippageBps=${slippage * 100}&txVersion=V0`
  );

  const swapData = swapResponse?.data ?? swapResponse;

  // 3. Post to Raydium to generate swap transactions
  const { data: swapTransactions } = await axios.post<{
    id: string;
    version: string;
    success: boolean;
    data: { transaction: string }[];
  }>(`${API_URLS.SWAP_HOST}/transaction/swap-base-in`, {
    computeUnitPriceMicroLamports: computeFee,
    swapResponse: swapData,
    txVersion: "V0",
    wallet: owner.publicKey.toBase58(),
    wrapSol: true,
    unwrapSol: false,
  });

  if (!swapTransactions?.success || !swapTransactions?.data?.length) {
    throw new Error(`Raydium transaction generation failed: ${JSON.stringify(swapTransactions)}`);
  }

  const allTxBuf = swapTransactions.data.map((tx) =>
    Buffer.from(tx.transaction, "base64")
  );
  const allTransactions = allTxBuf.map((txBuf) =>
    VersionedTransaction.deserialize(txBuf)
  );

  let idx = 0;
  for (const transaction of allTransactions) {
    idx++;
    transaction.sign([owner]);

    const rawTransaction = transaction.serialize();
    const txId = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 3
    });

    console.log(`${idx} transaction sending..., txId: ${txId}`);

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction(
      {
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        signature: txId,
      },
      "confirmed"
    );
    console.log(`${idx} transaction confirmed`);
  }
}


