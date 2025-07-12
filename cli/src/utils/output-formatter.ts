import { writeFile } from 'fs/promises';
import type { ExtractedQuestion } from '../types/index.js';

export class OutputFormatter {
  async outputJson(questions: ExtractedQuestion[], outputPath?: string): Promise<void> {
    const jsonOutput = JSON.stringify(questions, null, 2);
    
    if (outputPath) {
      await writeFile(outputPath, jsonOutput, 'utf-8');
    } else {
      console.log(jsonOutput);
    }
  }
}