const ClaudeLLM = require('../llms/claude-llm');

// Mock response data
const mockResponses = {
    textResponse: {
        content: [{ text: 'Hello, how can I help you?' }]
    },
    streamResponse: {
        async *[Symbol.asyncIterator]() {
            const chunks = [
                { delta: { text: 'Hello' } },
                { delta: { text: ' world' } },
                { delta: { text: '!' } }
            ];
            for (const chunk of chunks) {
                yield chunk;
            }
        }
    },
    error: new Error('API Error')
};

// Mock message samples
const mockMessages = {
    textOnly: [{
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }]
    }],
    imageOnly: [{
        role: 'user',
        content: [{
            type: 'image_url',
            image_url: {
                url: 'data:image/png;base64,abc123'
            }
        }]
    }]
};

// Mock the Anthropic package
jest.mock('@anthropic-ai/sdk', () => {
    // Create mock messages instance with methods that can be configured per test
    const mockMessagesApi = {
        create: jest.fn()
    };

    // Create the main mock class
    return class AnthropicMock {
        constructor(config) {
            this.config = config;
            this.messages = mockMessagesApi;
        }

        static mockMessages = mockMessagesApi;
    };
});

// Get access to the mock messages API
const Anthropic = require('@anthropic-ai/sdk');
const mockMessagesApi = Anthropic.mockMessages;

describe('ClaudeLLM', () => {
    let claudeLLM;
    const mockApiKey = 'test-api-key';
    const mockModel = 'claude-3';

    beforeEach(() => {
        jest.clearAllMocks();
        claudeLLM = new ClaudeLLM(mockApiKey, mockModel);
    });

    test('constructor should initialize with correct configuration', () => {
        expect(claudeLLM.apiKey).toBe(mockApiKey);
        expect(claudeLLM.model).toBe(mockModel);
    });

    test('_convertImageToClaudeFormat should handle base64 strings correctly', () => {
        const input = 'data:image/png;base64,abc123';
        const expected = 'abc123';
        expect(claudeLLM._convertImageToClaudeFormat(input)).toBe(expected);

        // Should not modify strings without data URL prefix
        const rawBase64 = 'abc123';
        expect(claudeLLM._convertImageToClaudeFormat(rawBase64)).toBe(rawBase64);
    });

    test('_convertMessages should handle text messages correctly', () => {
        const expected = [{
            role: 'user',
            content: [{ type: 'text', text: 'Hello' }]
        }];

        expect(claudeLLM._convertMessages(mockMessages.textOnly)).toEqual(expected);
    });

    test('_convertMessages should handle image messages correctly', () => {
        const expected = [{
            role: 'user',
            content: [{
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: 'abc123'
                }
            }]
        }];

        expect(claudeLLM._convertMessages(mockMessages.imageOnly)).toEqual(expected);
    });

    test('getResponse should return expected response', async () => {
        mockMessagesApi.create.mockResolvedValue(mockResponses.textResponse);

        const response = await claudeLLM.getResponse(mockMessages.textOnly);
        
        expect(response).toBe('Hello, how can I help you?');
        expect(mockMessagesApi.create).toHaveBeenCalledWith({
            model: 'claude-3-5-sonnet-latest',
            messages: mockMessages.textOnly,
            max_tokens: 4096
        });
    });

    test('streamResponse should yield expected chunks', async () => {
        mockMessagesApi.create.mockResolvedValue(mockResponses.streamResponse);

        const stream = await claudeLLM.streamResponse(mockMessages.textOnly);
        
        expect(mockMessagesApi.create).toHaveBeenCalledWith({
            model: 'claude-3-5-sonnet-latest',
            messages: mockMessages.textOnly,
            max_tokens: 4096,
            stream: true
        });

        let result = '';
        for await (const chunk of stream) {
            result += chunk;
        }
        expect(result).toBe('Hello world!');
    });

    test('getResponse should handle errors', async () => {
        mockMessagesApi.create.mockRejectedValue(mockResponses.error);

        await expect(claudeLLM.getResponse([]))
            .rejects
            .toThrow('API Error');
    });

    test('_convertMessages should handle empty or invalid messages', () => {
        expect(claudeLLM._convertMessages([])).toEqual([]);
        expect(claudeLLM._convertMessages(null)).toEqual([]);
        expect(claudeLLM._convertMessages(undefined)).toEqual([]);
    });

    test('_convertMessages should filter out invalid content parts', () => {
        const input = [{
            role: 'user',
            content: [
                { type: 'text', text: 'Hello' },
                { type: 'invalid_type' },
                { type: 'image_url', image_url: null }
            ]
        }];

        const expected = [{
            role: 'user',
            content: [
                { type: 'text', text: 'Hello' }
            ]
        }];

        expect(claudeLLM._convertMessages(input)).toEqual(expected);
    });
}); 