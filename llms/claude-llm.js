const LLM = require('./llm');

class ClaudeLLM extends LLM {
    constructor(apiKey, hostUrl = '') {
        super(apiKey, hostUrl);
    }

    async getResponse(msg) {
        // TODO: Implement actual Claude API call
        return `Claude Response to: ${msg}`;
    }

    async streamResponse(msg) {
        // TODO: Implement actual Claude streaming
        const response = `Claude Streaming Response to: ${msg}`;
        return async function* () {
            for (const char of response) {
                yield char;
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }();
    }
}

module.exports = ClaudeLLM; 