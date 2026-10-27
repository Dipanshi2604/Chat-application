# Chat Backend

A chat backend built with **Node.js**, **TypeScript**, **PostgreSQL**, and **Firebase Firestore**.

## Tech Stack
- **Node.js & TypeScript** (Strict typing enabled)
- **PostgreSQL** (with Prisma ORM) for Users, Chats, and Memberships
- **Firebase Firestore** for Messages, Read Receipts, and Last Seen tracking
- **Express.js** & **Zod** for API routing and request validation
- **Jest & Supertest** for integration tests

---

## Getting Started

### 1. Prerequisites
- Node.js (v20+)
- PostgreSQL running locally

### 2. Environment Setup
Copy the example environment file:
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

### 3. Database Migration & Seed
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

### 5. Run Tests
```bash
npm test
```

---

## API Endpoints

### 1. Create or Get Chat
Finds or creates a direct 1:1 chat between two users.

- **URL**: `POST /chat/create`
- **Body**:
  ```json
  {
    "userAId": "<USER_A_ID>",
    "userBId": "<USER_B_ID>"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "chatId": "e229e62e-ff6a-4f51-b0db-6f17e3efc975"
  }
  ```

---

### 2. Send Message
Stores message in Firestore with timestamp. Sender must be a member of the chat.

- **URL**: `POST /chat/:chatId/message/send`
- **Body**:
  ```json
  {
    "senderId": "<USER_ID>",
    "text": "Hello there!"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "id": "6dbb2ca1-e737-41a4-9989-d4e5fcf4c7d0",
    "chatId": "e229e62e-ff6a-4f51-b0db-6f17e3efc975",
    "senderId": "<USER_ID>",
    "text": "Hello there!",
    "createdAt": "2026-10-27T10:00:00.000Z",
    "readBy": {
      "<USER_ID>": "2026-10-27T10:00:00.000Z"
    }
  }
  ```

---

### 3. Get Messages
Retrieves messages ordered chronologically by timestamp.

- **URL**: `GET /chat/:chatId/messages?limit=50`
- **Response** (`200 OK`):
  ```json
  {
    "messages": [
      {
        "id": "6dbb2ca1-e737-41a4-9989-d4e5fcf4c7d0",
        "chatId": "e229e62e-ff6a-4f51-b0db-6f17e3efc975",
        "senderId": "<USER_ID>",
        "text": "Hello there!",
        "createdAt": "2026-10-27T10:00:00.000Z",
        "readBy": {
          "<USER_ID>": "2026-10-27T10:00:00.000Z"
        }
      }
    ]
  }
  ```

---

### 4. Mark Message Read
Updates the read receipt map for the message in Firestore.

- **URL**: `POST /chat/:chatId/message/:messageId/read`
- **Body**:
  ```json
  {
    "userId": "<USER_ID>"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true
  }
  ```

---

### 5. Update Last Seen Message
Updates the last seen pointer per user per chat in Firestore.

- **URL**: `POST /chat/:chatId/lastseen`
- **Body**:
  ```json
  {
    "userId": "<USER_ID>",
    "messageId": "<MESSAGE_ID>"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true
  }
  ```

---

### 6. List User Chats
Queries PostgreSQL for all chats the user belongs to, including member IDs.

- **URL**: `GET /user/:userId/chats`
- **Response** (`200 OK`):
  ```json
  {
    "chats": [
      {
        "chatId": "e229e62e-ff6a-4f51-b0db-6f17e3efc975",
        "createdAt": "2026-10-27T10:00:00.000Z",
        "memberIds": [
          "<USER_A_ID>",
          "<USER_B_ID>"
        ]
      }
    ]
  }
  ```
