import { LangGraphThread } from '../types/langgraph';

/**
 * Result type for render script execution
 */
export interface RenderResult {
  type: 'markdown' | 'graph' | 'error';
  content: string | GraphSpec;
  error?: string;
}

/**
 * Graph specification for Chart.js
 */
export interface GraphSpec {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'bubble' | 'radar';
  data: {
    labels: string[];
    datasets: Array<{
      label?: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
      [key: string]: any;
    }>;
  };
  options?: {
    [key: string]: any;
  };
}

/**
 * Safely executes a JavaScript render function on LangGraph threads
 * @param threads - Array of LangGraph threads to render
 * @param renderCode - JavaScript code containing a renderContent function
 * @returns Render result with content type and data
 */
export function executeRenderScript(
  threads: LangGraphThread[],
  renderCode: string
): RenderResult {
  try {
    console.log('🎨 [JavaScriptRender] Executing render script for', threads.length, 'threads');
    console.log('   Render code length:', renderCode.length);
    console.log('   Render code preview:', renderCode.substring(0, 100) + (renderCode.length > 100 ? '...' : ''));
    
    // Check if renderCode is empty
    if (!renderCode || renderCode.trim() === '') {
      console.warn('⚠️ [JavaScriptRender] Empty render code provided');
      return {
        type: 'error',
        content: '',
        error: 'No render code provided'
      };
    }
    
    // Clean the render code - remove markdown code block markers if present
    let cleanedCode = renderCode.trim();
    
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
    const sandboxedFunction = new Function('threads', `
      ${cleanedCode}
      
      // Call the render function if it exists
      if (typeof renderContent === 'function') {
        return renderContent(threads);
      } else {
        throw new Error('No renderContent function found in the code');
      }
    `);
    
    // Execute the render function in a try-catch to handle runtime errors
    const result = sandboxedFunction(threads);
    
    // Determine the type of result
    if (typeof result === 'string') {
      console.log('✅ [JavaScriptRender] Markdown content generated, length:', result.length);
      return {
        type: 'markdown',
        content: result
      };
    } else if (typeof result === 'object' && result !== null && 'type' in result && 'data' in result) {
      console.log('✅ [JavaScriptRender] Graph specification generated, type:', result.type);
      return {
        type: 'graph',
        content: result as GraphSpec
      };
    } else {
      throw new Error('Render function must return either a string (markdown) or a graph specification object');
    }
    
  } catch (error) {
    console.error('❌ [JavaScriptRender] Error executing render script:', error);
    return {
      type: 'error',
      content: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validates JavaScript render code before execution
 * @param renderCode - JavaScript code to validate
 * @returns true if code appears safe, false otherwise
 */
export function validateRenderScript(renderCode: string): boolean {
  // Clean the render code first
  let cleanedCode = renderCode.trim();
  
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
      console.warn('⚠️ [JavaScriptRender] Potentially dangerous pattern detected:', pattern);
      return false;
    }
  }
  
  // Check for required function
  if (!cleanedCode.includes('function renderContent')) {
    console.warn('⚠️ [JavaScriptRender] No renderContent function found');
    return false;
  }
  
  return true;
}