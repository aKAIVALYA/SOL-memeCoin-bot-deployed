import 'dotenv/config'
import { getTokenFromLLM } from "./get-token-from-llm";
import { getTweets } from "./get-tweets";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { swap } from "./swap";

const SOL_AMOUNT = Math.floor(0.001 * LAMPORTS_PER_SOL);

// Read the Twitter username from the .env file
const TWITTER_USERNAME = process.env.TWITTER_USERNAME;

if (!TWITTER_USERNAME) {
  throw new Error("TWITTER_USERNAME is not set in the .env file");
}

async function main(userName: string) {
  const newTweets = await getTweets(userName);

  for (let tweet of newTweets) {
    const tokenAddress = await getTokenFromLLM(tweet.contents)
    if (tokenAddress !== "null") {
      await swap(tokenAddress, SOL_AMOUNT);
    }
  }
}

main(TWITTER_USERNAME);