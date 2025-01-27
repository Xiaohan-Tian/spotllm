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

    _convertImageToGeminiFormat(base64String) {
        // Remove data URL prefix if present
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
        return base64Data;
    }

    // Convert OpenAI-style messages to Gemini format
    _convertMessages(messages) {
        if (!messages || messages.length < 1) {
            return [null, []];
        }

        // Process the last message
        const lastMessageContent = messages[messages.length - 1].content;
        let lastMessageParts = [];
        
        for (const part of lastMessageContent) {
            if (part.type === 'text') {
                lastMessageParts.push({ text: part.text });
            } else if (part.type === 'image_url' && part.image_url?.url) {
                const imageData = this._convertImageToGeminiFormat(part.image_url.url);
                lastMessageParts.push({
                    inlineData: {
                        mimeType: 'image/png',
                        data: imageData
                    }
                });
            }
        }

        // Process previous messages
        const previousMessages = messages.slice(0, -1).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts: msg.content.map(part => {
                if (part.type === 'text') {
                    return { text: part.text };
                }
                // Skip image parts in history as they're not supported in chat history
                return null;
            }).filter(Boolean)
        }));

        return [lastMessageParts, previousMessages];
    }

    async getResponse(messages) {
        try {
            const [lastMessageParts, previousMessages] = this._convertMessages(messages);
            const chat = this.model.startChat({
                history: previousMessages
            });
            const result = await chat.sendMessage(lastMessageParts);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    }

    async streamResponse(messages) {
        try {
            const [lastMessageParts, previousMessages] = this._convertMessages(messages);
            const chat = this.model.startChat({
                history: previousMessages
            });
            const result = await chat.sendMessageStream(lastMessageParts);

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