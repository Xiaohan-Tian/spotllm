// Base LLM class
class LLM {
    constructor(apiKey, hostUrl = '') {
        if (this.constructor === LLM) {
            throw new Error('LLM is an abstract class and cannot be instantiated directly');
        }
        this.apiKey = apiKey;
        this.hostUrl = hostUrl;
    }

    async getResponse(msg) {
        throw new Error('getResponse must be implemented by child classes');
    }

    async streamResponse(msg) {
        throw new Error('streamResponse must be implemented by child classes');
    }

    // Factory method to create the appropriate LLM instance
    static create(model, apiKey, hostUrl = '') {
        let LLMClass;
        const modelLower = model.toLowerCase();

        if (modelLower.includes('gpt') || modelLower.includes('private')) {
            LLMClass = require('./gpt-llm');
        } else if (modelLower.includes('gemini')) {
            LLMClass = require('./gemini-llm');
        } else if (modelLower.includes('claude') || modelLower.includes('private')) {
            LLMClass = require('./claude-llm');
        } else {
            throw new Error(`Unsupported model: ${model}`);
        }

        return new LLMClass(apiKey, hostUrl);
    }
}

module.exports = LLM;
