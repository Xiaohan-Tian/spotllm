const LLM = require('./llm');
const Anthropic = require('@anthropic-ai/sdk');

class ClaudeLLM extends LLM {
    constructor(apiKey, model, hostUrl = '') {
        super(apiKey, model, hostUrl);
        const config = {
            apiKey: this.apiKey
        };
        
        // If hostUrl is provided, use it as a custom base URL
        if (this.modelMappings[model] === 'private' && this.hostUrl) {
            config.baseURL = this.hostUrl;
        }
        
        this.client = new Anthropic(config);
        console.log('Using Claude model:', this.modelMappings[model] || 'claude-3-5-sonnet-latest');
        console.log('API Key:', '*'.repeat(this.apiKey.length - 4) + this.apiKey.slice(-4));
    }

    async getResponse(messages) {
        try {
            const completion = await this.client.messages.create({
                model: this.modelMappings[this.model] || 'claude-3-5-sonnet-latest',
                messages: messages,
                max_tokens: 4096
            });
            
            return completion.content[0].text;
        } catch (error) {
            console.error('Claude API error:', error);
            throw error;
        }
    }

    async streamResponse(messages) {
        try {
            const stream = await this.client.messages.create({
                model: this.modelMappings[this.model] || 'claude-3-5-sonnet-latest',
                messages: messages,
                max_tokens: 4096,
                stream: true
            });

            return async function* () {
                for await (const chunk of stream) {
                    const content = chunk.delta?.text || '';
                    if (content) {
                        yield content;
                        process.stdout.write(content);
                    }
                }
            }();
        } catch (error) {
            console.error('Claude API streaming error:', error);
            throw error;
        }
    }
}

module.exports = ClaudeLLM; 