import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PromptLoader {
  private static promptsDir = path.join(__dirname, '..', 'prompts');

  /**
   * Load a prompt template from file
   * @param filename The name of the prompt file
   * @returns The prompt template string
   */
  static loadPrompt(filename: string): string {
    const filePath = path.join(this.promptsDir, filename);
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error(`Failed to load prompt from ${filename}:`, error);
      throw new Error(`Prompt file not found: ${filename}`);
    }
  }

  /**
   * Replace placeholders in a prompt template
   * @param template The prompt template with placeholders
   * @param replacements Object containing key-value pairs for replacement
   * @returns The prompt with placeholders replaced
   */
  static replacePlaceholders(template: string, replacements: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    return result;
  }

  /**
   * Load and prepare a prompt with replacements
   * @param filename The name of the prompt file
   * @param replacements Object containing key-value pairs for replacement
   * @returns The prepared prompt
   */
  static preparePrompt(filename: string, replacements: Record<string, string>): string {
    const template = this.loadPrompt(filename);
    return this.replacePlaceholders(template, replacements);
  }
}