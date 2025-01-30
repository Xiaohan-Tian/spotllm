const GeminiLLM = require('../llms/gemini-llm');

// Mock response data
const mockResponses = {
    textResponse: {
        response: {
            text: () => 'Hello, how can I help you?'
        }
    },
    streamResponse: {
        stream: {
            async *[Symbol.asyncIterator]() {
                const chunks = [
                    { text: () => 'Hello' },
                    { text: () => ' world' },
                    { text: () => '!' }
                ];
                for (const chunk of chunks) {
                    yield chunk;
                }
            }
        }
    },
    error: new Error('API Error')
};

// Mock the Google Generative AI package
jest.mock('@google/generative-ai', () => {
    // Create mock chat instance with methods that can be configured per test
    const mockChat = {
        sendMessage: jest.fn(),
        sendMessageStream: jest.fn()
    };

    // Create mock model instance that returns the mock chat
    const mockModel = {
        startChat: jest.fn().mockReturnValue(mockChat)
    };

    // Create the main mock class
    return {
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
            getGenerativeModel: jest.fn().mockReturnValue(mockModel)
        })),
        // Expose the mock chat for test configuration
        mockChat
    };
});

// Get access to the mock chat
const { mockChat } = require('@google/generative-ai');

describe('GeminiLLM', () => {
    let geminiLLM;
    const mockApiKey = 'test-api-key';
    const mockModel = 'gemini-pro';

    beforeEach(() => {
        jest.clearAllMocks();
        geminiLLM = new GeminiLLM(mockApiKey, mockModel);
    });

    test('constructor should initialize with correct configuration', () => {
        expect(geminiLLM.apiKey).toBe(mockApiKey);
        expect(geminiLLM.model).toBeDefined();
    });

    test('_convertImageToGeminiFormat should handle base64 strings correctly', () => {
        const input = 'data:image/png;base64,abc123';
        const expected = 'abc123';
        expect(geminiLLM._convertImageToGeminiFormat(input)).toBe(expected);

        // Should not modify strings without data URL prefix
        const rawBase64 = 'abc123';
        expect(geminiLLM._convertImageToGeminiFormat(rawBase64)).toBe(rawBase64);
    });

    test('_convertMessages should handle text messages correctly', () => {
        const messages = [{
            role: 'user',
            content: [{ type: 'text', text: 'Hello' }]
        }];

        const [lastMessageParts, previousMessages] = geminiLLM._convertMessages(messages);
        
        expect(lastMessageParts).toEqual([{ text: 'Hello' }]);
        expect(previousMessages).toEqual([]);
    });

    test('_convertMessages should handle image messages correctly', () => {
        const messages = [{
            role: 'user',
            content: [{
                type: 'image_url',
                image_url: {
                    url: 'data:image/png;base64,abc123'
                }
            }]
        }];

        const [lastMessageParts, previousMessages] = geminiLLM._convertMessages(messages);
        
        expect(lastMessageParts).toEqual([{
            inlineData: {
                mimeType: 'image/png',
                data: 'abc123'
            }
        }]);
        expect(previousMessages).toEqual([]);
    });

    test('_convertMessages should handle chat history correctly', () => {
        const messages = [
            {
                role: 'user',
                content: [{ type: 'text', text: 'First message' }]
            },
            {
                role: 'assistant',
                content: [{ type: 'text', text: 'First response' }]
            },
            {
                role: 'user',
                content: [{ type: 'text', text: 'Second message' }]
            }
        ];

        const [lastMessageParts, previousMessages] = geminiLLM._convertMessages(messages);
        
        expect(lastMessageParts).toEqual([{ text: 'Second message' }]);
        expect(previousMessages).toEqual([
            {
                role: 'user',
                parts: [{ text: 'First message' }]
            },
            {
                role: 'model',
                parts: [{ text: 'First response' }]
            }
        ]);
    });

    test('getResponse should return expected response', async () => {
        const mockMessages = [{
            role: 'user',
            content: [{ type: 'text', text: 'Hello' }]
        }];

        mockChat.sendMessage.mockResolvedValue(mockResponses.textResponse);

        const response = await geminiLLM.getResponse(mockMessages);
        
        expect(response).toBe('Hello, how can I help you?');
        expect(geminiLLM.model.startChat).toHaveBeenCalledWith({
            history: []
        });
        expect(mockChat.sendMessage).toHaveBeenCalledWith([{ text: 'Hello' }]);
    });

    test('streamResponse should yield expected chunks', async () => {
        const mockMessages = [{
            role: 'user',
            content: [{ type: 'text', text: 'Hello' }]
        }];

        mockChat.sendMessageStream.mockResolvedValue(mockResponses.streamResponse);

        const stream = await geminiLLM.streamResponse(mockMessages);

        let result = '';
        for await (const chunk of stream) {
            result += chunk;
        }
        expect(result).toBe('Hello world!');
        expect(geminiLLM.model.startChat).toHaveBeenCalledWith({
            history: []
        });
        expect(mockChat.sendMessageStream).toHaveBeenCalledWith([{ text: 'Hello' }]);
    });

    test('getResponse should handle errors', async () => {
        mockChat.sendMessage.mockRejectedValue(mockResponses.error);

        await expect(geminiLLM.getResponse([]))
            .rejects
            .toThrow('API Error');
    });

    test('_convertMessages should handle empty or invalid messages', () => {
        expect(geminiLLM._convertMessages([])).toEqual([null, []]);
        expect(geminiLLM._convertMessages(null)).toEqual([null, []]);
        expect(geminiLLM._convertMessages(undefined)).toEqual([null, []]);
    });
}); 