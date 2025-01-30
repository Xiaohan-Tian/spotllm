const LLM = require('../llms/llm');
const fs = require('fs');
const path = require('path');

// Mock the electron modules
jest.mock('electron', () => ({
    clipboard: {
        readText: jest.fn().mockReturnValue('clipboard content')
    }
}));

// Mock electron-store module
jest.mock('electron-store', () => {
    const mockStore = {
        get: jest.fn().mockReturnValue([
            { shortcut: 'test', template: 'Test template {content}', key: 'test-key' },
            { shortcut: 'date', template: 'Date: {date}', key: 'date-key' },
            { shortcut: 'time', template: 'Time: {time}', key: 'time-key' },
            { shortcut: 'clip', template: 'Clipboard: {clipboard}', key: 'clip-key' }
        ])
    };
    return jest.fn(() => mockStore);
});

// Mock fs module
jest.mock('fs', () => ({
    readFileSync: jest.fn()
}));

// Create a concrete implementation for testing
class TestLLM extends LLM {
    async getResponse() { return 'test response'; }
    async streamResponse() { return 'test stream'; }
}

describe('LLM', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset static modelMappings
        LLM.modelMappings = null;
    });

    test('cannot instantiate abstract LLM class directly', () => {
        expect(() => new LLM('key', 'model')).toThrow('LLM is an abstract class');
    });

    test('can instantiate concrete implementation', () => {
        const llm = new TestLLM('test-key', 'test-model');
        expect(llm.apiKey).toBe('test-key');
        expect(llm.model).toBe('test-model');
    });

    test('loads model mappings from file', () => {
        const mockMappings = { model1: 'mapping1', model2: 'mapping2' };
        fs.readFileSync.mockReturnValue(JSON.stringify(mockMappings));

        const llm = new TestLLM('key', 'model');
        
        expect(fs.readFileSync).toHaveBeenCalledWith(
            expect.stringContaining('res/model.json'),
            'utf8'
        );
        expect(llm.modelMappings).toEqual(mockMappings);
    });

    test('handles model mappings file error', () => {
        fs.readFileSync.mockImplementation(() => {
            throw new Error('File not found');
        });

        const llm = new TestLLM('key', 'model');
        expect(llm.modelMappings).toEqual({});
    });

    describe('applyTemplate', () => {
        test('returns original content when not starting with /', () => {
            const [content, key, applied] = LLM.applyTemplate('normal content');
            expect(content).toBe('normal content');
            expect(key).toBeNull();
            expect(applied).toBe(false);
        });

        test('applies template with content placeholder', () => {
            const [content, key, applied] = LLM.applyTemplate('/test additional content');
            expect(content).toBe('Test template additional content');
            expect(key).toBe('test-key');
            expect(applied).toBe(true);
        });

        test('applies template with date placeholder', () => {
            const [content] = LLM.applyTemplate('/date');
            expect(content).toMatch(/Date: \d{4}-\d{2}-\d{2}/);
        });

        test('applies template with time placeholder', () => {
            const [content] = LLM.applyTemplate('/time');
            expect(content).toMatch(/Time: \d{2}:\d{2}:\d{2}/);
        });

        test('applies template with clipboard placeholder', () => {
            const [content] = LLM.applyTemplate('/clip');
            expect(content).toBe('Clipboard: clipboard content');
        });

        test('returns original content when template not found', () => {
            const [content, key, applied] = LLM.applyTemplate('/nonexistent');
            expect(content).toBe('/nonexistent');
            expect(key).toBeNull();
            expect(applied).toBe(false);
        });
    });

    describe('factory create method', () => {
        test('creates GPT instance for gpt models', () => {
            const llm = LLM.create('key', 'gpt-4o');
            expect(llm.constructor.name).toBe('GPTLLM');
        });

        // TODO: fix Gemini LLM test
        // test('creates Gemini instance for gemini models', () => {
        //     const llm = LLM.create('key', 'gemini-1.5-flash');
        //     expect(llm.constructor.name).toBe('GeminiLLM');
        // });

        test('creates Claude instance for claude models', () => {
            const llm = LLM.create('key', 'claude-3-5-sonnet');
            expect(llm.constructor.name).toBe('ClaudeLLM');
        });

        test('throws error for unsupported model', () => {
            expect(() => LLM.create('key', 'unsupported-model'))
                .toThrow('Unsupported model: unsupported-model');
        });
    });
}); 