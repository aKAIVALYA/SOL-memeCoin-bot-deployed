import axios from 'axios';

const TWEET_MAX_TIME_MS = 60 * 60 * 1000; 

interface Tweet {
    contents: string;
    id: string;
    createdAt: string;
}

export async function getTweets(userName: string): Promise<Tweet[]> {
    const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `https://twttrapi.p.rapidapi.com/user-tweets?username=${userName}`,
        headers: { 
            'x-rapidapi-host': 'twttrapi.p.rapidapi.com', 
            'x-rapidapi-key': process.env.RAPIDAPI_KEY || ''
        }
    };

    try {
        const response = await axios.request(config);
        const instructions = response.data?.data?.user_result?.result?.timeline_response?.timeline?.instructions;
        if (!Array.isArray(instructions)) return [];

        const timelineResponse = instructions.filter((x: any) => x.__typename === "TimelineAddEntries");
        if (!timelineResponse.length || !Array.isArray(timelineResponse[0]?.entries)) return [];

        const tweets: Tweet[] = [];
        timelineResponse[0].entries.forEach((x: any) => {
            try {
                const tweetResult = x.content?.content?.tweetResult?.result;
                if (!tweetResult) return;
                const legacy = tweetResult.legacy;
                const tweetId = legacy?.id_str || tweetResult.rest_id;
                const contents = legacy?.full_text || tweetResult.core?.user_result?.result?.legacy?.description;
                const createdAt = legacy?.created_at;

                if (tweetId && contents && createdAt) {
                    tweets.push({ contents, id: tweetId, createdAt });
                }
            } catch (e) {
                // Skip invalid individual entries
            }
        });

        return tweets.filter(x => new Date(x.createdAt).getTime() > Date.now() - TWEET_MAX_TIME_MS);
    } catch (e: any) {
        console.error(`Error fetching tweets for @${userName}:`, e.message);
        return [];
    }
}


 