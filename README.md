# Solana Token Swap Bot

This project is a Solana bot that scans tweets, uses OpenAI to detect bullish posts about Solana tokens, and automatically swaps SOL for those tokens using the Raydium protocol.

## Features

- Fetches tweets from a specified user.
- Uses OpenAI GPT-4o to identify bullish posts and extract Solana token addresses.
- Swaps SOL for detected tokens via Raydium.
- Uses environment variables for sensitive keys and configuration.

## Folder Structure

```
src/
  ├── get-token-from-llm.ts   # Uses OpenAI to extract token addresses from tweets
  ├── get-tweets.ts           # Fetches tweets from a user
  ├── index.ts                # Main entry point
  ├── swap.ts                 # Handles the swap logic using Raydium and Solana
.env                           # Store your API keys and secrets here
.gitignore                     # Ignores node_modules, .env, dist
```

## Setup

1. **Clone the repository:**
   ```sh
   git clone https://github.com/yourusername/your-repo-name.git
   cd your-repo-name
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory with the following keys:
   ```
   RAPIDAPI_KEY=your_rapidapi_key
   OPENAI_KEY=your_openai_key
   PRIVATE_KEY=your_solana_private_key
   RPC_URL=your_solana_rpc_url
   ```

4. **Run the bot:**
   ```sh
   npm start
   ```
   Or, if you use TypeScript directly:
   ```sh
   npx ts-node src/index.ts
   ```

## Usage

- Edit `src/index.ts` to specify the Twitter username you want to scan.
- The bot will fetch tweets, analyze them, and swap SOL for tokens mentioned in bullish posts.

## Security

- **Never commit your `.env` file or private keys to public repositories.**
- The `.gitignore` file is set up to prevent this.

## License

MIT
