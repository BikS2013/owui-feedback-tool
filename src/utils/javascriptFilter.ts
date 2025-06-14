import { LangGraphThread } from '../types/langgraph';

/**
 * Safely executes a JavaScript filter function on LangGraph threads
 * @param threads - Array of LangGraph threads to filter
 * @param filterCode - JavaScript code containing a filterThreads function
 * @returns Filtered threads or original threads if execution fails
 */
export function applyJavaScriptFilter(
  threads: LangGraphThread[],
  filterCode: string
): LangGraphThread[] {
  try {
    console.log('🔧 [JavaScriptFilter] Applying filter to', threads.length, 'threads');
    console.log('   Filter code length:', filterCode.length);
    console.log('   Filter code preview:', filterCode.substring(0, 100) + (filterCode.length > 100 ? '...' : ''));
    
    // Check if filterCode is empty
    if (!filterCode || filterCode.trim() === '') {
      console.warn('⚠️ [JavaScriptFilter] Empty filter code provided, returning all threads');
      return threads;
    }
    
    // Clean the filter code - remove markdown code block markers if present
    let cleanedCode = filterCode.trim();
    
    // Remove markdown code block markers
    if (cleanedCode.startsWith('```javascript') || cleanedCode.startsWith('```js')) {
      cleanedCode = cleanedCode.replace(/^```(?:javascript|js)\n?/, '');
    }
    if (cleanedCode.startsWith('```')) {
      cleanedCode = cleanedCode.replace(/^```\n?/, '');
    }
    if (cleanedCode.endsWith('```')) {
      cleanedCode = cleanedCode.replace(/\n?```$/, '');
    }
    
    console.log('   Cleaned code preview:', cleanedCode.substring(0, 100) + (cleanedCode.length > 100 ? '...' : ''));
    
    // Create a sandboxed function using Function constructor
    // This is safer than eval but still requires trusted input
    const sandboxedFunction = new Function('threads', `
      ${cleanedCode}
      
      // Call the filter function if it exists
      if (typeof filterThreads === 'function') {
        return filterThreads(threads);
      } else if (typeof processThreads === 'function') {
        return processThreads(threads);
      } else {
        throw new Error('No filterThreads or processThreads function found in the code');
      }
    `);
    
    // Execute the filter in a try-catch to handle runtime errors
    const filteredThreads = sandboxedFunction(threads);
    
    // Validate the result
    if (!Array.isArray(filteredThreads)) {
      throw new Error('Filter function must return an array');
    }
    
    console.log('✅ [JavaScriptFilter] Filter applied successfully, returned', filteredThreads.length, 'threads');
    return filteredThreads;
    
  } catch (error) {
    console.error('❌ [JavaScriptFilter] Error executing filter:', error);
    // Return original threads if filter fails
    return threads;
  }
}

/**
 * Validates JavaScript filter code before execution
 * @param filterCode - JavaScript code to validate
 * @returns true if code appears safe, false otherwise
 */
export function validateJavaScriptFilter(filterCode: string): boolean {
  // Clean the filter code first
  let cleanedCode = filterCode.trim();
  
  // Remove markdown code block markers
  if (cleanedCode.startsWith('```javascript') || cleanedCode.startsWith('```js')) {
    cleanedCode = cleanedCode.replace(/^```(?:javascript|js)\n?/, '');
  }
  if (cleanedCode.startsWith('```')) {
    cleanedCode = cleanedCode.replace(/^```\n?/, '');
  }
  if (cleanedCode.endsWith('```')) {
    cleanedCode = cleanedCode.replace(/\n?```$/, '');
  }
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    /\beval\b/,
    /\bFunction\s*\(/,
    /\bfetch\b/,
    /\bXMLHttpRequest\b/,
    /\bimport\b/,
    /\brequire\b/,
    /\bdocument\b/,
    /\bwindow\b/,
    /\bglobal\b/,
    /\bprocess\b/,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(cleanedCode)) {
      console.warn('⚠️ [JavaScriptFilter] Potentially dangerous pattern detected:', pattern);
      return false;
    }
  }
  
  // Check for required function
  if (!cleanedCode.includes('function filterThreads') && !cleanedCode.includes('function processThreads')) {
    console.warn('⚠️ [JavaScriptFilter] No filterThreads or processThreads function found');
    return false;
  }
  
  return true;
}