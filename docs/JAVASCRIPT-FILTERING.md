# JavaScript Filtering for LangGraph Data

## Overview

The OWUI Feedback application now supports JavaScript-based filtering for LangGraph data through natural language queries. This feature allows users to create complex, custom filters that go beyond the standard UI filters.

## How It Works

### 1. Natural Language Input
Users can enter natural language queries in the Filter Panel's "Natural Language" tab, such as:
- "Show me threads with more than 10 messages"
- "Find conversations where the user mentioned 'error' or 'bug'"
- "Get threads created in the last 7 days with retrieved documents"
- "Show threads where the assistant provided code examples"

### 2. JavaScript Code Generation
When working with LangGraph data:
- The system sends the current thread as sample data to the LLM
- The LLM analyzes the data structure and generates a JavaScript filter function
- The generated code follows a safe pattern: `function filterThreads(threads) { ... }`

### 3. Client-Side Execution
The JavaScript filter is executed safely on the client:
- The filter code is validated for dangerous patterns (no eval, fetch, DOM access)
- It's executed in a sandboxed environment using the Function constructor
- The filter is applied to the raw LangGraph threads before conversion to conversations

### 4. Visual Feedback
- The filter button shows an active state indicator when a JavaScript filter is applied
- The Natural Language tab displays an "Active" badge
- Tooltips show the active query for reference

## Example JavaScript Filters

### Filter by Message Count
```javascript
function filterThreads(threads) {
  return threads.filter(thread => {
    const messageCount = thread.values?.messages?.length || 0;
    return messageCount > 10;
  });
}
```

### Filter by Content
```javascript
function filterThreads(threads) {
  return threads.filter(thread => {
    const messages = thread.values?.messages || [];
    return messages.some(msg => 
      msg.content && msg.content.toLowerCase().includes('error')
    );
  });
}
```

### Filter by Retrieved Documents
```javascript
function filterThreads(threads) {
  return threads.filter(thread => {
    const docs = thread.values?.retrieved_docs || [];
    return docs.length > 0;
  });
}
```

### Complex Time-Based Filter
```javascript
function filterThreads(threads) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  return threads.filter(thread => {
    const createdAt = new Date(thread.created_at);
    const hasRecentActivity = createdAt > sevenDaysAgo;
    const hasLongConversation = (thread.values?.messages?.length || 0) > 5;
    
    return hasRecentActivity && hasLongConversation;
  });
}
```

## Security Considerations

The JavaScript filtering system includes several security measures:

1. **Pattern Validation**: Dangerous patterns are blocked (eval, Function constructor, network requests)
2. **Sandboxed Execution**: Code runs in a restricted environment
3. **Error Handling**: Failed filters fall back to showing all data
4. **No Side Effects**: Filters can only read data, not modify it

## Limitations

- JavaScript filtering is currently only available for LangGraph data
- The generated code must follow the `filterThreads` function pattern
- Complex aggregations or data transformations are not supported
- Performance may be impacted with very large datasets

## Future Enhancements

Planned improvements include:
- Support for JavaScript filtering on file-based data
- Custom filter templates for common use cases
- Filter history and saved filters
- Performance optimizations for large datasets