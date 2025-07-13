# Prompts Directory

This directory contains all LLM prompts used by the CLI tool, making them easy to maintain and modify without changing the core logic.

## Files

### topic-identification.ts

Contains prompts and configuration for the `identify_topics` command.

**Exports:**
- `buildSystemPrompt(existingTopics)` - Builds the system prompt with rules for topic classification
- `buildHumanPrompt(params)` - Builds the human prompt with conversation context
- `TOPIC_IDENTIFICATION_CONFIG` - Configuration settings (temperature, maxTokens, fallbackTopic)

**To modify topic identification behavior:**

1. **Change classification rules**: Edit the rules in `buildSystemPrompt()`
2. **Adjust context presentation**: Modify `buildHumanPrompt()` 
3. **Change LLM parameters**: Update `TOPIC_IDENTIFICATION_CONFIG`

**Example modifications:**

```typescript
// Make topics more specific (3-5 words instead of 2-4)
// In buildSystemPrompt():
"1. Topics should be short (3-5 words) and suitable for classification"

// Change temperature for more/less consistency
TOPIC_IDENTIFICATION_CONFIG = {
  temperature: 0.2, // Higher = more creative, Lower = more consistent
  ...
}

// Change fallback topic name
TOPIC_IDENTIFICATION_CONFIG = {
  fallbackTopic: 'General Inquiry',
  ...
}
```

## Best Practices

1. **Test changes**: After modifying prompts, test with a small sample first
2. **Version control**: Document significant prompt changes in commit messages
3. **Keep prompts focused**: Each prompt file should handle one specific task
4. **Use TypeScript**: Define interfaces for prompt parameters for type safety