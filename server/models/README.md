# Database Models

This directory contains all MongoDB models for the AI Chat Application.

## Models Overview

### User Model (`User.js`)
Stores user account information and preferences.
- **Fields**: email, passwordHash, name, preferences (locationEnabled, manualLocation, timezone, theme, voiceEnabled, ttsEnabled)
- **Indexes**: email (unique)

### Chat Model (`Chat.js`)
Enhanced conversation model with support for branches, folders, tags, and sharing.
- **Fields**: userId, title, messages, branches, folderId, tags, sharedWith
- **Indexes**: 
  - userId + updatedAt (for listing user's chats)
  - userId + folderId (for folder filtering)
  - userId + tags (for tag filtering)
  - messages.content (text index for full-text search)

### Message Schema (embedded in Chat)
Individual messages within a conversation.
- **Fields**: role, content, originalPrompt, version, incomplete, branchId, createdAt

### Branch Schema (embedded in Chat)
Conversation branches for exploring alternate discussion paths.
- **Fields**: name, parentBranchId, branchFromMessageIndex, createdAt

### Reaction Model (`Reaction.js`)
User feedback on AI messages (like/dislike).
- **Fields**: userId, messageId, conversationId, type
- **Indexes**: 
  - conversationId + messageId
  - userId + messageId (unique - one reaction per user per message)

### Folder Model (`Folder.js`)
Organizational folders for conversations.
- **Fields**: userId, name, parentId
- **Indexes**: userId

### Tag Model (`Tag.js`)
Tags for categorizing conversations.
- **Fields**: userId, name, color
- **Indexes**: userId

### Share Model (`Share.js`)
Conversation sharing with permission levels.
- **Fields**: conversationId, ownerId, shareId, permission, expiresAt, accessCount, lastAccessedAt
- **Indexes**: 
  - shareId (unique)
  - conversationId
  - expiresAt (TTL index for auto-deletion)

### ScheduledPrompt Model (`ScheduledPrompt.js`)
Automated prompts executed on a schedule.
- **Fields**: userId, prompt, schedule (cron format), conversationId, enabled, lastExecutedAt, nextExecutionAt
- **Indexes**: 
  - userId + enabled
  - nextExecutionAt + enabled

### Webhook Model (`Webhook.js`)
Webhook configurations for external integrations.
- **Fields**: userId, url, triggers, headers, enabled
- **Indexes**: userId + enabled

### WebhookLog Model (`Webhook.js`)
Execution logs for webhooks.
- **Fields**: webhookId, executedAt, success, statusCode, responseTime, error, payload
- **Indexes**: 
  - webhookId + executedAt
  - executedAt (TTL index - 30 days retention)

### PluginMetadata Model (`PluginMetadata.js`)
Metadata for installed plugins.
- **Fields**: userId, name, version, description, author, enabled, config, installedAt
- **Indexes**: userId

## Database Indexes

All indexes are created automatically by Mongoose when the models are first used. The indexes are designed to optimize:

1. **User data isolation**: All user-specific queries are indexed by userId
2. **Conversation listing**: Sorted by updatedAt for recent conversations
3. **Organization**: Fast filtering by folders and tags
4. **Search**: Full-text search on message content
5. **Sharing**: Fast lookup by shareId
6. **Scheduled tasks**: Efficient queries for due schedules
7. **Webhook logs**: Time-based queries with automatic cleanup (TTL)

## Environment Variables

Make sure to set the following in your `.env` file:

```
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=your-secret-key-for-jwt-tokens
```

## Usage

Import models using the central export:

```javascript
import { User, Chat, Reaction, Folder, Tag } from "./models/index.js";
```

Or import individually:

```javascript
import User from "./models/User.js";
import Chat from "./models/Chat.js";
```
