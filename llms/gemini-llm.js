const LLM = require('./llm');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiLLM extends LLM {
    constructor(apiKey, model, hostUrl = '') {
        super(apiKey, model, hostUrl);
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: this.modelMappings[model] || this.modelMappings.geminiPro
        });
        console.log('Using Gemini model:', this.modelMappings[model] || this.modelMappings.geminiPro);
        if (this.apiKey && this.apiKey.length > 4) {
            console.log('API Key:', '*'.repeat(this.apiKey.length - 4) + this.apiKey.slice(-4));
        }
    }

    // Convert OpenAI-style messages to Gemini format
    _convertMessages(messages) {
        if (!messages || messages.length < 1) {
            return [null, []];
        }

        const lastMessage = messages[messages.length - 1].content;
        const previousMessages = messages.slice(0, -1).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts: [{ text: msg.content }]
        }));
        return [lastMessage, previousMessages];
    }

    async getResponse(messages) {
        try {
            const [lastMessage, previousMessages] = this._convertMessages(messages);
            const chat = this.model.startChat({
                history: previousMessages
            });
            const result = await chat.sendMessage(lastMessage);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    }

    async streamResponse(messages) {
        try {
            const [lastMessage, previousMessages] = this._convertMessages(messages);
            const chat = this.model.startChat({
                history: previousMessages
            });
            const result = await chat.sendMessageStream(lastMessage);

            return async function* () {
                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    yield chunkText;
                    process.stdout.write(chunkText);
                }
            }();
        } catch (error) {
            console.error('Gemini API streaming error:', error);
            throw error;
        }
    }
}

module.exports = GeminiLLM;