const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const SEARCH_API_URL = 'http://hotel-search-service:3002';
const GEMINI_API_URL = process.env.GEMINI_API_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- Helper function to call Gemini ---
async function callGemini(prompt) {
    try {
        const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            contents: [{ parts: [{ text: prompt }] }]
        });
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Gemini API Error:", error.response ? error.response.data : error.message);
        throw new Error("Failed to get a response from the AI model.");
    }
}

// --- Main Chat Endpoint ---
app.post('/chat', async (req, res) => {
    const { message } = req.body;

    try {
        // Step 1: Parse the user's intent
        const intentPrompt = `Analyze the following user message to determine the intent and parameters. Respond with ONLY a valid JSON object.
        Possible intents are "search_hotels" or "general_chat".
        For "search_hotels", extract "destination", "startDate", "endDate", and "people".
        If it's a general conversation, the intent is "general_chat".
        
        Example 1:
        User: "istanbul'da 2 kişi 20-25 temmuz arası otel lazım"
        JSON: {"intent": "search_hotels", "params": {"destination": "istanbul", "startDate": "2024-07-20", "endDate": "2024-07-25", "people": 2}}

        Example 2:
        User: "merhaba nasılsın?"
        JSON: {"intent": "general_chat", "params": {}}

        User Message: "${message}"`;

        const rawIntentResponse = await callGemini(intentPrompt);
        const cleanedJson = rawIntentResponse.replace(/```json|```/g, '').trim();
        const parsedIntent = JSON.parse(cleanedJson);

        let reply = "I'm not sure how to help with that.";

        // Step 2: Act based on the intent
        if (parsedIntent.intent === 'search_hotels') {
            const args = parsedIntent.params;
            const searchUrl = `${SEARCH_API_URL}/search?destination=${args.destination}&startDate=${args.startDate}&endDate=${args.endDate}&people=${args.people}`;
            
            const searchResult = await axios.get(searchUrl);
            const hotels = searchResult.data;

            if (hotels.length > 0) {
                // If hotels are found, send them back as structured data
                reply = {
                    type: 'hotel_list',
                    data: hotels.slice(0, 5) // Send top 5 results
                };
            } else {
                // If no hotels found, ask Gemini to formulate a nice response
                reply = await callGemini("You are a friendly hotel assistant. The user's search returned no results. Inform them kindly.");
            }

        } else { // general_chat
            const chatPrompt = `You are a friendly hotel booking assistant. The user said: "${message}". Respond conversationally.`;
            reply = await callGemini(chatPrompt);
        }

        res.json({ reply });

    } catch (error) {
        console.error("Error in chat processing:", error.message);
        res.status(500).json({ reply: "Sorry, I had a problem processing your request." });
    }
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`AI Agent Service listening on port ${PORT}`);
}); 