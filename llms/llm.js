const path = require('path');
const fs = require('fs');

// Base LLM class
class LLM {
    static modelMappings = null;

    constructor(apiKey, model, hostUrl = '') {
        if (this.constructor === LLM) {
            throw new Error('LLM is an abstract class and cannot be instantiated directly');
        }

        // Load model mappings if not already loaded
        if (!LLM.modelMappings) {
            try {
                const modelPath = path.join(__dirname, '..', 'res', 'model.json');
                const modelData = fs.readFileSync(modelPath, 'utf8');
                LLM.modelMappings = JSON.parse(modelData);
            } catch (error) {
                console.error('Error loading model mappings:', error);
                LLM.modelMappings = {};
            }
        }

        this.apiKey = apiKey;
        this.model = model;
        this.hostUrl = hostUrl;
        this.modelMappings = LLM.modelMappings;
    }

    static applyTemplate(content) {
        if (!content.startsWith('/')) {
            return content;
        }

        const shortcut = content.slice(1).trim();
        const store = new (require('electron-store'))();
        const templates = store.get('templates') || [];
        
        const matchedTemplate = templates.find(t => t.shortcut === shortcut);
        if (!matchedTemplate) {
            return content;
        }

        let templateContent = matchedTemplate.template;
        
        // Replace placeholders
        if (templateContent.includes('{content}')) {
            const clipboard = require('electron').clipboard;
            templateContent = templateContent.replaceAll('{content}', clipboard.readText());
        }
        
        if (templateContent.includes('{date}')) {
            const date = new Date();
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
            templateContent = templateContent.replaceAll('{date}', dateStr);
        }
        
        if (templateContent.includes('{time}')) {
            const date = new Date();
            const timeStr = date.toTimeString().split(' ')[0]; // HH:MM:SS format
            templateContent = templateContent.replaceAll('{time}', timeStr);
        }

        return [templateContent, matchedTemplate.key];
    }

    async getResponse(msg) {
        throw new Error('getResponse must be implemented by child classes');
    }

    async streamResponse(msg) {
        throw new Error('streamResponse must be implemented by child classes');
    }

    // Factory method to create the appropriate LLM instance
    static create(apiKey, model, hostUrl = '') {
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

        return new LLMClass(apiKey, model, hostUrl);
    }
}

module.exports = LLM;
