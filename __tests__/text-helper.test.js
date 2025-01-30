const { extractJsonFromMarkdown } = require('../helpers/text-helper');

describe('extractJsonFromMarkdown', () => {
    test('should extract JSON from plain text', () => {
        const input = `some normal text\n\n{"hello": "world"}\nsome other text`;
        const expected = { hello: "world" };
        expect(extractJsonFromMarkdown(input)).toEqual(expected);
    });

    test('should extract JSON from code block without language specification', () => {
        const input = `some normal text\n\`\`\`\n{"hello": "world"}\n\`\`\`\n\nsome other text`;
        const expected = { hello: "world" };
        expect(extractJsonFromMarkdown(input)).toEqual(expected);
    });

    test('should extract JSON from code block with json language specification', () => {
        const input = `some normal text\n\`\`\`json\n{"hello": "world"}\n\`\`\`\n\nsome other text`;
        const expected = { hello: "world" };
        expect(extractJsonFromMarkdown(input)).toEqual(expected);
    });

    test('should return null for invalid input', () => {
        expect(extractJsonFromMarkdown(null)).toBeNull();
        expect(extractJsonFromMarkdown(undefined)).toBeNull();
        expect(extractJsonFromMarkdown('')).toBeNull();
    });

    test('should return null for text without JSON', () => {
        const input = 'just some normal text without any JSON';
        expect(extractJsonFromMarkdown(input)).toBeNull();
    });

    test('should return null for invalid JSON', () => {
        const input = `some text\n\`\`\`json\n{"hello": "world" invalid json here}\n\`\`\``;
        expect(extractJsonFromMarkdown(input)).toBeNull();
    });
});