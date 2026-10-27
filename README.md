# Chat Backend

A chat backend built with **Node.js**, **TypeScript**, **PostgreSQL**, and **Firebase Firestore**.

## Tech Stack
- **Node.js & TypeScript** (Strict typing enabled)
- **PostgreSQL** (with Prisma ORM) for Users, Chats, Memberships, and Roles
- **Firebase Firestore** for Messages, Read Receipts, and Last Seen tracking
- **Express.js** & **Zod** for API routing and request validation
- **Jest & Supertest** for integration tests

---

## Getting Started

### 1. Prerequisites
- Node.js (v20+)
- PostgreSQL running locally

### 2. Environment Setup
```bash
cp .env.example .env
```

Ensure your `DATABASE_URL` in `.env` points to your PostgreSQL database:
```env
PORT=4000
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/chat_backend?schema=public"

# Optional: Add Firebase credentials if connecting to live Firebase project
# If omitted, the server runs with an in-memory Firestore-compatible store for local testing
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

### 3. Database Setup & Seed
Apply the schema and seed initial test users (`Alice`, `Bob`, `Charlie`):
```bash
# Push schema to database
npm run db:push

# Or apply SQL directly:
# psql -d chat_backend -f prisma/schema.sql

# Seed test users
npm run db:seed
```

### 4. Run Server
```bash
# Development (with hot reloading)
npm run dev

# Or build & start
npm run build
npm start
```

### 5. Testing with Postman
Import `postman_collection.json` into Postman to test all endpoints (1:1 chat, messaging, read receipts, last seen, group chat management, and message editing/deletion).

---

## API Endpoints

### 1. Create or Get 1:1 Chat
- **URL**: `POST /chat/create`
- **Body**: `{ "userAId": "<USER_A_ID>", "userBId": "<USER_B_ID>" }`
- **Response** (`200 OK`): `{ "chatId": "uuid" }`

---

### 2. Send Message
- **URL**: `POST /chat/:chatId/message/send`
- **Body**: `{ "senderId": "<USER_ID>", "text": "Hello there!" }`
- **Response** (`201 Created`): Returns created message object with Firestore timestamp.

---

### 3. Get Messages
- **URL**: `GET /chat/:chatId/messages?limit=50`
- **Response** (`200 OK`): `{ "messages": [...] }` (ordered chronologically).

---

### 4. Mark Message Read
- **URL**: `POST /chat/:chatId/message/:messageId/read`
- **Body**: `{ "userId": "<USER_ID>" }`
- **Response** (`200 OK`): `{ "success": true }`

---

### 5. Update Last Seen Message
- **URL**: `POST /chat/:chatId/lastseen`
- **Body**: `{ "userId": "<USER_ID>", "messageId": "<MESSAGE_ID>" }`
- **Response** (`200 OK`): `{ "success": true }`

---

### 6. List User Chats
- **URL**: `GET /user/:userId/chats`
- **Response** (`200 OK`): List of user's chats with `memberIds`, `isGroup`, and `title`.

---

### 7. Create Group Chat
- **URL**: `POST /chat/group/create`
- **Body**:
  ```json
  {
    "title": "Engineering Team",
    "adminId": "<ADMIN_USER_ID>",
    "memberIds": ["<USER_B_ID>", "<USER_C_ID>"]
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "chatId": "uuid",
    "title": "Engineering Team",
    "isGroup": true,
    "members": [
      { "userId": "<ADMIN_USER_ID>", "role": "ADMIN" },
      { "userId": "<USER_B_ID>", "role": "MEMBER" }
    ]
  }
  ```

---

### 8. Add Group Member
- **URL**: `POST /chat/:chatId/members/add`
- **Body**:
  ```json
  {
    "requestingUserId": "<ADMIN_USER_ID>",
    "userId": "<NEW_USER_ID>"
  }
  ```
- **Response** (`200 OK`): `{ "success": true, "addedUserId": "<NEW_USER_ID>" }`

---

### 9. Remove Group Member
- **URL**: `POST /chat/:chatId/members/remove`
- **Body**:
  ```json
  {
    "requestingUserId": "<ADMIN_USER_ID>",
    "userId": "<USER_TO_REMOVE>"
  }
  ```
- **Response** (`200 OK`): `{ "success": true, "removedUserId": "<USER_TO_REMOVE>" }`

---

### 10. Edit Message
- **URL**: `PATCH /chat/:chatId/message/:messageId`
- **Body**:
  ```json
  {
    "userId": "<AUTHOR_USER_ID>",
    "text": "Edited text"
  }
  ```
- **Response** (`200 OK`): Returns updated message with `isEdited: true` and `editedAt`.

---

### 11. Delete Message
- **URL**: `DELETE /chat/:chatId/message/:messageId`
- **Body**:
  ```json
  {
    "userId": "<AUTHOR_USER_ID>"
  }
  ```
- **Response** (`200 OK`): Soft-deletes message (`isDeleted: true`, text replaced with `"This message was deleted"`).
