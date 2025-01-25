const LLM = require('./llm');

class GeminiLLM extends LLM {
    constructor(apiKey, hostUrl = '') {
        super(apiKey, hostUrl);
    }

    async getResponse(messages) {
        // Get the last user message from the conversation array
        const lastUserMessage = messages
            .slice()
            .reverse()
            .find(msg => msg.role === 'user')?.content || '';
            
        return `Gemini Response to: ${lastUserMessage}`;
    }

    async streamResponse(messages) {
        // Get the last user message from the conversation array
        const lastUserMessage = messages
            .slice()
            .reverse()
            .find(msg => msg.role === 'user')?.content || '';
            
        const response = `Gemini Streaming Response to: **${lastUserMessage}**`;
        const words = response.split(' ');
        
        return async function* () {
            for (let i = 0; i < words.length; i++) {
                yield words[i] + (i < words.length - 1 ? ' ' : '');
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }();
    }
}

module.exports = GeminiLLM;