const LLM = require('./llm');
const OpenAI = require('openai');

class GPTLLM extends LLM {
    constructor(apiKey, model, hostUrl = '') {
        super(apiKey, model, hostUrl);
        const config = {
            apiKey: this.apiKey
        };

        // If hostUrl is provided, use it as a custom base URL
        if (this.modelMappings[model] === `private` && this.hostUrl) {
            config.baseURL = this.hostUrl;
        }
        
        this.client = new OpenAI(config);
        console.log('Using GPT model:', this.modelMappings[model] || 'gpt-4o');
        console.log('API Key:', '*'.repeat(this.apiKey.length - 4) + this.apiKey.slice(-4));
    }

    async getResponse(messages) {
        try {
            const completion = await this.client.chat.completions.create({
                model: this.modelMappings[this.model] || 'gpt-4o',
                messages: messages,
            });
            
            return completion.choices[0].message.content;
        } catch (error) {
            console.error('GPT API error:', error);
            throw error;
        }
    }

    async streamResponse(messages) {
        try {
            const stream = await this.client.chat.completions.create({
                model: this.modelMappings[this.model] || 'gpt-4o',
                messages: messages,
                stream: true,
            });

            return async function* () {
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        yield content;
                        process.stdout.write(content);
                    }
                }
            }();
        } catch (error) {
            console.error('GPT API streaming error:', error);
            throw error;
        }
    }
}

module.exports = GPTLLM; 