/**
 * Parses parameters from a prompt text using {} notation
 * Handles {{}} as escaped braces that should be ignored
 */
export function parsePromptParameters(promptText: string): string[] {
  if (!promptText) return [];
  
  const parameters = new Set<string>();
  
  // First, temporarily replace escaped braces {{}} with a placeholder
  const placeholder = '\u0000ESCAPED_BRACE\u0000';
  const textWithPlaceholders = promptText
    .replace(/\{\{/g, placeholder + 'OPEN')
    .replace(/\}\}/g, placeholder + 'CLOSE');
  
  // Now find all single brace patterns {parameterName}
  const paramRegex = /\{([^{}]+)\}/g;
  let match;
  
  while ((match = paramRegex.exec(textWithPlaceholders)) !== null) {
    // Check if this match contains our placeholder (meaning it was escaped)
    if (!match[0].includes(placeholder) && !match[1].includes(placeholder)) {
      // Clean up the parameter name (trim whitespace)
      const paramName = match[1].trim();
      if (paramName) {
        parameters.add(paramName);
      }
    }
  }
  
  // Convert Set to Array to remove duplicates and return sorted
  return Array.from(parameters).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

/**
 * Formats a prompt by replacing parameters with values
 * Handles {{}} as escaped braces
 */
export function formatPromptWithValues(
  promptText: string, 
  parameterValues: Record<string, string>
): string {
  if (!promptText) return '';
  
  // First, temporarily replace escaped braces
  const placeholder = '\u0000ESCAPED_BRACE\u0000';
  let formattedText = promptText
    .replace(/\{\{/g, placeholder + 'OPEN')
    .replace(/\}\}/g, placeholder + 'CLOSE');
  
  // Replace parameters with their values
  Object.entries(parameterValues).forEach(([param, value]) => {
    const regex = new RegExp(`\\{${param}\\}`, 'g');
    formattedText = formattedText.replace(regex, value);
  });
  
  // Restore escaped braces as single braces
  formattedText = formattedText
    .replace(new RegExp(placeholder + 'OPEN', 'g'), '{')
    .replace(new RegExp(placeholder + 'CLOSE', 'g'), '}');
  
  return formattedText;
}

/**
 * Get current date in YYYY/MM/DD format
 */
export function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

/**
 * Get current datetime in YYYY/MM/DD HH:mm:ss format
 */
export function getCurrentDateTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}