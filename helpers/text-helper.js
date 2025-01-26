/**
 * Extracts the first valid JSON object from a markdown string
 * @param {string} markdownString - The input markdown string that may contain JSON
 * @returns {object|null} The parsed JSON object if found and valid, null otherwise
 */
function extractJsonFromMarkdown(markdownString) {
    if (!markdownString) return null;

    // Try to find JSON in code blocks first
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g;
    const codeBlockMatches = [...markdownString.matchAll(codeBlockRegex)];

    // Try each code block for valid JSON
    for (const match of codeBlockMatches) {
        if (match[1]) {
            try {
                const parsed = JSON.parse(match[1].trim());
                if (parsed) return parsed;
            } catch (e) {
                // Continue to next match if parsing fails
                continue;
            }
        }
    }

    // If no valid JSON found in code blocks, try to find JSON-like content directly in the text
    const directJsonRegex = /{[^{}]*(?:{[^{}]*})*[^{}]*}/g;
    const directMatches = [...markdownString.matchAll(directJsonRegex)];

    // Try each potential JSON match
    for (const match of directMatches) {
        try {
            const parsed = JSON.parse(match[0]);
            if (parsed) return parsed;
        } catch (e) {
            continue;
        }
    }

    return null;
}

module.exports = {
    extractJsonFromMarkdown
};