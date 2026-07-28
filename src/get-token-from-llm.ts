import openAI from 'openai';

export async function getTokenFromLLM(contents: string): Promise<string> {
    const apiKey = process.env.OPENAI_KEY;
    if (!apiKey || apiKey === 'mock-openai-key') {
        return "null";
    }

    const openai = new openAI({ apiKey });
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        store: true,
        messages: [
            { "role": "system", "content": "You are an AI trading bot assistant. Tell me if this tweet is bullish about a Solana token. If bullish, return ONLY the raw Base58 Solana mint address (32 to 44 characters). If not bullish or no token address is found, return null." },
            { "role": "user", "content": contents }
        ]
    });

    const rawContent = completion.choices[0]?.message?.content?.trim() ?? "null";
    if (rawContent === "null" || rawContent.toLowerCase().includes("null")) {
        return "null";
    }

    const match = rawContent.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
    return match ? match[0] : "null";
}

