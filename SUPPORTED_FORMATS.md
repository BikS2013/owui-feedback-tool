# SUPPORTED FORMATS

This document describes the supported data formats for the OWUI Feedback application, including how to identify and handle each format.

## Format 1: Feedback Export Format (Current)

### Identification
- **File structure**: Array of feedback entries
- **Key identifier**: Each entry has the following structure:
  - `id` (string)
  - `user_id` (string)
  - `version` (number)
  - `type` (string) - typically "rating"
  - `data` (object) - contains rating information
  - `meta` (object) - contains metadata about the feedback
  - `snapshot` (object) - contains the full chat snapshot

### Structure Details
```json
[
  {
    "id": "string",
    "user_id": "string",
    "version": 0,
    "type": "rating",
    "data": {
      "rating": 1 | -1,
      "model_id": "string",
      "sibling_model_ids": null,
      "reason": "string",
      "comment": "string",
      "tags": [],
      "details": {
        "rating": number | null
      }
    },
    "meta": {
      "model_id": "string",
      "message_id": "string",
      "message_index": number,
      "chat_id": "string",
      "base_models": {}
    },
    "snapshot": {
      "chat": {
        "id": "string",
        "user_id": "string",
        "title": "string",
        "chat": {
          "id": "",
          "title": "string",
          "models": ["string"],
          "params": {},
          "history": {
            "messages": {
              "messageId": { /* Message object */ }
            }
          },
          "messages": [ /* Array of messages */ ]
        },
        "updated_at": number,
        "created_at": number
      }
    },
    "created_at": number,
    "updated_at": number
  }
]
```

### Processing Method
- Each entry represents a feedback event on a specific message
- The `snapshot.chat` contains the full conversation state at the time of feedback
- Messages can be in either:
  - `chat.messages` array (preferred)
  - `chat.history.messages` dictionary (fallback)
- Q&A pairs are extracted by finding the rated message and its parent

## Format 2: Chat Export Format (New - OWUICHATW_202503.json)

### Identification
- **File structure**: Array of chat objects
- **Key identifier**: Each entry has:
  - `id` (string)
  - `user_id` (string)
  - `title` (string)
  - `chat` (object) - contains the full chat data
  - No `version`, `type`, `data`, `meta`, or `snapshot` fields

### Structure Details
```json
[
  {
    "id": "string",
    "user_id": "string",
    "title": "string",
    "chat": {
      "id": "",
      "title": "string",
      "models": ["string"],
      "params": {},
      "history": {
        "messages": {
          "messageId": {
            "id": "string",
            "parentId": string | null,
            "childrenIds": ["string"],
            "role": "user" | "assistant",
            "content": "string",
            "timestamp": number,
            "models": ["string"] | undefined,
            "model": "string" | undefined,
            "modelName": "string" | undefined,
            "modelIdx": number | undefined,
            "userContext": null,
            "lastSentence": "string" | undefined,
            "done": boolean | undefined
          }
        }
      }
    },
    "updated_at": number | undefined,
    "created_at": number | undefined,
    // Additional fields may be present
  }
]
```

### Key Differences from Format 1
1. **No feedback data**: This format contains only chat conversations without ratings or feedback
2. **Top-level structure**: Chat data is at the root level, not nested in a snapshot
3. **No meta information**: Missing feedback-specific metadata
4. **Direct chat access**: The chat object is directly accessible without going through snapshot

### Processing Method
- Each entry represents a complete chat conversation
- Messages are stored in `chat.history.messages` as a dictionary
- Since there's no feedback data, these chats will:
  - Have null ratings
  - Show as unrated conversations
  - Not contribute to analytics that depend on ratings
- Timestamps may be missing from the top level (created_at, updated_at)

## Format Detection Logic

```typescript
function detectFormat(data: any[]): 'feedback' | 'chat' | 'unknown' {
  if (!Array.isArray(data) || data.length === 0) {
    return 'unknown';
  }
  
  const firstEntry = data[0];
  
  // Check for Feedback Export Format
  if (firstEntry.version !== undefined && 
      firstEntry.type !== undefined && 
      firstEntry.data !== undefined && 
      firstEntry.meta !== undefined && 
      firstEntry.snapshot !== undefined) {
    return 'feedback';
  }
  
  // Check for Chat Export Format
  if (firstEntry.chat !== undefined && 
      firstEntry.title !== undefined &&
      firstEntry.version === undefined &&
      firstEntry.type === undefined &&
      firstEntry.snapshot === undefined) {
    return 'chat';
  }
  
  return 'unknown';
}
```

## Conversion Strategy

### Converting Chat Format to Internal Structure
When importing Chat Export Format files:

1. **Create synthetic feedback entries**: Since the app expects feedback data, we'll need to either:
   - Option A: Import as conversations with no feedback (show as unrated)
   - Option B: Skip these files with a user message
   - Option C: Create a minimal feedback wrapper

2. **Recommended approach (Option A)**:
   - Import chats as conversations without ratings
   - Set `averageRating` to null
   - Set `totalRatings` to 0
   - Create empty `feedbackEntries` array
   - Preserve all message data

3. **Data mapping**:
   ```typescript
   // From Chat Export Format
   const chatEntry = {
     id: entry.id,
     user_id: entry.user_id,
     title: entry.title,
     chat: entry.chat,
     created_at: entry.created_at || entry.chat.history.messages[0]?.timestamp,
     updated_at: entry.updated_at || /* latest message timestamp */
   };
   
   // To Internal Conversation Format
   const conversation = {
     id: chatEntry.id,
     title: chatEntry.title,
     userId: chatEntry.user_id,
     createdAt: chatEntry.created_at,
     updatedAt: chatEntry.updated_at,
     messages: Object.values(chatEntry.chat.history.messages),
     averageRating: null,
     totalRatings: 0,
     feedbackEntries: [],
     modelsUsed: /* extract from messages */,
     qaPairCount: /* count assistant messages */
   };
   ```

## Implementation Notes

1. **Backward Compatibility**: The current format (Format 1) must continue to work without changes
2. **Format Detection**: Should happen automatically on file upload
3. **User Feedback**: Clear messaging about what data is available from each format
4. **Analytics Impact**: Chat-only imports won't contribute to rating-based analytics
5. **Export Considerations**: When exporting, maintain the original format or provide format options