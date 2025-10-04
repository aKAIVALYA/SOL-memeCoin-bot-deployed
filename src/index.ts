import 'dotenv/config'
import { getTokenFromLLM } from "./get-token-from-llm";
import { getTweets } from "./get-tweets";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { swap } from "./swap";

const SOL_AMOUNT = Math.floor(0.001 * LAMPORTS_PER_SOL);

async function main(userName: string) {
  const newTweets = await getTweets(userName);

  for (let tweet of newTweets) {
    const tokenAddress = await getTokenFromLLM(tweet.contents)
    if (tokenAddress !== "null") {
      await swap(tokenAddress, SOL_AMOUNT);
    }
  }
}

main("BotChrome114342");