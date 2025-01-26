const LLM = require('./llm');

class GPTLLM extends LLM {
    constructor(apiKey, model, hostUrl = '') {
        super(apiKey, model, hostUrl);
    }

    async getResponse(msg) {
        // TODO: Implement actual GPT API call
        return `GPT Response to: ${msg}`;
    }

    async streamResponse(msg) {
        // TODO: Implement actual GPT streaming
        const response = `GPT Streaming Response to: ${msg}`;
        return async function* () {
            for (const char of response) {
                yield char;
                await new Promise(resolve => setTimeout(resolve, 50)); // Simulate streaming
            }
        }();
    }
}

module.exports = GPTLLM; 