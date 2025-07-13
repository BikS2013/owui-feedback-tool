export interface TopicWithDescription {
  topic: string;
  description: string;
}

export interface TopicIdentificationPromptParams {
  existingTopics: TopicWithDescription[];
  previousQuestions?: { index: number; text: string }[];
  currentQuestion: { index: number; text: string };
  isFirstQuestion: boolean;
}

export function buildSystemPrompt(existingTopics: TopicWithDescription[]): string {
  return `You are a topic classifier for customer service conversations. Your task is to identify the main topic of each question, considering the context of the conversation.

Rules:
1. Topics should be short (2-4 words) and suitable for classification
2. Topics should be general enough to group similar questions but specific enough to be meaningful
3. Use title case for topics (e.g., "Account Management", "Payment Issues")
4. If an existing topic fits well, use it instead of creating a new one
5. Consider the conversation context - if previous questions provide context, use it to better classify the current question
6. If all questions in a thread relate to the same topic, they should all get the same topic
7. When creating a new topic, provide a clear description of what types of questions belong to this topic

${existingTopics.length > 0 ? `Existing topics with descriptions:
${existingTopics.map(t => `- ${t.topic}: ${t.description}`).join('\n')}` : 'No existing topics yet. Create the first topic with its description.'}`;
}

export function buildHumanPrompt(params: TopicIdentificationPromptParams): string {
  let prompt = '';
  
  if (params.isFirstQuestion) {
    prompt = `This is the first question in a conversation thread:\n`;
    prompt += `Question: "${params.currentQuestion.text}"\n\n`;
  } else {
    prompt = `This is a conversation thread. Here are the previous questions for context:\n`;
    params.previousQuestions?.forEach(q => {
      prompt += `Question ${q.index}: "${q.text}"\n`;
    });
    prompt += `\nNow identify the topic for this question:\n`;
    prompt += `Question ${params.currentQuestion.index}: "${params.currentQuestion.text}"\n\n`;
  }
  
  prompt += `Respond with a JSON object containing:
- "topic": the topic name (existing or new)
- "description": ONLY if creating a new topic, provide a description of what questions belong to this topic

Examples:
For existing topic: {"topic": "Payment Issues"}
For new topic: {"topic": "Card Services", "description": "Questions about credit cards, debit cards, card activation, and card-related services"}`;
  
  return prompt;
}

export const TOPIC_IDENTIFICATION_CONFIG = {
  temperature: 0.1,
  maxTokens: 150, // Increased to accommodate JSON response with description
  fallbackTopic: 'Uncategorized',
  fallbackDescription: 'Questions that do not fit into other categories'
};