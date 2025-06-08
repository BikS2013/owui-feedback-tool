import { TextRun, HeadingLevel, ExternalHyperlink } from 'docx';

/**
 * Parses a string with markdown bold notation (**text**) and links [text](url)
 * @param text The text to parse
 * @param font The font family to use (default: 'Aptos')
 * @returns Array of TextRun objects and ExternalHyperlink objects
 */
export function parseMarkdownToTextRuns(text: string, font: string = 'Aptos'): (TextRun | ExternalHyperlink)[] {
  const runs: (TextRun | ExternalHyperlink)[] = [];
  
  // Combined regex for bold and links
  // Matches **bold** or [link text](url)
  const markdownRegex = /(\*\*([^*]+)\*\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match;

  while ((match = markdownRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      if (beforeText) {
        runs.push(new TextRun({
          text: beforeText,
          font
        }));
      }
    }

    if (match[1]) {
      // Bold text match
      runs.push(new TextRun({
        text: match[2],
        bold: true,
        font
      }));
    } else if (match[3]) {
      // Link match
      const linkText = match[4];
      const linkUrl = match[5];
      
      runs.push(new ExternalHyperlink({
        link: linkUrl,
        children: [
          new TextRun({
            text: linkText,
            font,
            style: 'Hyperlink'
          })
        ]
      }));
    }

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      runs.push(new TextRun({
        text: remainingText,
        font
      }));
    }
  }

  // If no matches were found, return the entire text as a single run
  if (runs.length === 0 && text) {
    runs.push(new TextRun({
      text,
      font
    }));
  }

  return runs;
}

/**
 * Detects markdown heading level from a line of text
 * @param line The line to check
 * @returns Object with heading level and cleaned text, or null if not a heading
 */
export function detectMarkdownHeading(line: string): { level: typeof HeadingLevel[keyof typeof HeadingLevel]; text: string } | null {
  // Check for markdown heading syntax
  const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
  
  if (!headingMatch) {
    return null;
  }

  const hashCount = headingMatch[1].length;
  const headingText = headingMatch[2];

  // Map markdown heading levels to DOCX heading levels
  const headingMap: { [key: number]: typeof HeadingLevel[keyof typeof HeadingLevel] } = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6
  };

  return {
    level: headingMap[hashCount] || HeadingLevel.HEADING_6,
    text: headingText
  };
}