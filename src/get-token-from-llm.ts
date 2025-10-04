import openAI from 'openai';

const openai = new openAI({
    apiKey: process.env.OPENAI_KEY
});

export async function getTokenFromLLM(contents: string){
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        store: true,
        messages: [
            {"role": "system", "content": "you are an AI agent that needs to tell me if this tweet is about a solana token. Return me rither the adress of the solana token, or return me null if you cant find a solana token adress in this tweet. only return if it says it is a bull post. " },
            {"role": "user", "content": contents}
        ]
    });
    return completion.choices[0].message.content ?? "null";
        
} 
