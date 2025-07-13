import { TopicWithDescription } from '../prompts/topic-identification.js';

export interface TopicIdentificationPromptParams {
  existingTopics: TopicWithDescription[];
  previousQuestions?: { index: number; text: string }[];
  currentQuestion: { index: number; text: string };
  isFirstQuestion: boolean;
}

/**
 * Replace placeholders in a prompt template
 */
export function replacePlaceholders(template: string, params: Record<string, any>): string {
  let result = template;
  
  // Replace placeholders like {{key}} or {{ key }}
  Object.keys(params).forEach(key => {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(placeholder, String(params[key]));
  });
  
  return result;
}

/**
 * Build the full prompt from template
 */
export function buildPromptFromTemplate(
  template: string,
  params: TopicIdentificationPromptParams
): string {
  // Prepare the context based on whether it's the first question
  let context = '';
  if (params.isFirstQuestion) {
    context = `This is the first question in a conversation thread:\nQuestion: "${params.currentQuestion.text}"`;
  } else {
    context = `This is a conversation thread. Here are the previous questions for context:\n`;
    params.previousQuestions?.forEach(q => {
      context += `Question ${q.index}: "${q.text}"\n`;
    });
    context += `\nNow identify the topic for this question:\n`;
    context += `Question ${params.currentQuestion.index}: "${params.currentQuestion.text}"`;
  }
  
  // Prepare existing topics list
  let existingTopicsList = '';
  if (params.existingTopics.length > 0) {
    existingTopicsList = params.existingTopics
      .map(t => `- ${t.topic}: ${t.description}`)
      .join('\n');
  } else {
    existingTopicsList = 'No existing topics yet. Create the first topic with its description.';
  }
  
  // Replace placeholders in the template
  const placeholders = {
    context: context,
    existingTopics: existingTopicsList,
    currentQuestionText: params.currentQuestion.text,
    currentQuestionIndex: params.currentQuestion.index
  };
  
  return replacePlaceholders(template, placeholders);
}