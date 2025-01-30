const GPTLLM = require('../llms/gpt-llm');

// Mock response data
const mockResponses = {
    textResponse: {
        choices: [{
            message: {
                content: 'Hello, how can I help you?'
            }
        }]
    },
    streamResponse: {
        async *[Symbol.asyncIterator]() {
            const chunks = [
                { choices: [{ delta: { content: 'Hello' } }] },
                { choices: [{ delta: { content: ' world' } }] },
                { choices: [{ delta: { content: '!' } }] }
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
    textOnly: [{ role: 'user', content: 'Hello' }]
};

// Mock the OpenAI package
jest.mock('openai', () => {
    // Create mock completions instance with methods that can be configured per test
    const mockCompletionsApi = {
        create: jest.fn()
    };

    // Create the main mock class
    return class OpenAIMock {
        constructor(config) {
            this.config = config;
            this.chat = {
                completions: mockCompletionsApi
            };
        }

        static mockCompletions = mockCompletionsApi;
    };
});

// Get access to the mock completions API
const OpenAI = require('openai');
const mockCompletionsApi = OpenAI.mockCompletions;

describe('GPTLLM', () => {
    let gptLLM;
    const mockApiKey = 'test-api-key';
    const mockModel = 'gpt-4';

    beforeEach(() => {
        jest.clearAllMocks();
        gptLLM = new GPTLLM(mockApiKey, mockModel);
    });

    test('constructor should initialize with correct configuration', () => {
        expect(gptLLM.apiKey).toBe(mockApiKey);
        expect(gptLLM.model).toBe(mockModel);
    });

    test('getResponse should return expected response', async () => {
        mockCompletionsApi.create.mockResolvedValue(mockResponses.textResponse);

        const response = await gptLLM.getResponse(mockMessages.textOnly);
        
        expect(response).toBe('Hello, how can I help you?');
        expect(mockCompletionsApi.create).toHaveBeenCalledWith({
            model: 'gpt-4o',
            messages: mockMessages.textOnly
        });
    });

    test('streamResponse should yield expected chunks', async () => {
        mockCompletionsApi.create.mockResolvedValue(mockResponses.streamResponse);

        const stream = await gptLLM.streamResponse(mockMessages.textOnly);
        
        expect(mockCompletionsApi.create).toHaveBeenCalledWith({
            model: 'gpt-4o',
            messages: mockMessages.textOnly,
            stream: true
        });

        let result = '';
        for await (const chunk of stream) {
            result += chunk;
        }
        expect(result).toBe('Hello world!');
    });

    test('getResponse should handle errors', async () => {
        mockCompletionsApi.create.mockRejectedValue(mockResponses.error);

        await expect(gptLLM.getResponse([]))
            .rejects
            .toThrow('API Error');
    });

    test('constructor should use custom host URL for private models', () => {
        const customHostUrl = 'https://custom-openai.com';
        const privateModel = 'private';
        const gptLLMWithCustomHost = new GPTLLM(mockApiKey, privateModel, customHostUrl);
        
        expect(gptLLMWithCustomHost.client.config.baseURL).toBe(customHostUrl);
    });
}); 