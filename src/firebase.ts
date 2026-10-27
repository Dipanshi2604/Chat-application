import admin from "firebase-admin";
import { config } from "./config.js";
import { MessageDocument, LastSeenDocument } from "./types/chat.js";
import { randomUUID } from "node:crypto";

let firestoreDb: admin.firestore.Firestore | null = null;

const hasFirebaseCredentials = Boolean(
  config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey
);

if (hasFirebaseCredentials) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });
    firestoreDb = admin.firestore();
    console.log(`[Firebase] Initialized with project ID: ${config.firebase.projectId}`);
  } catch (err) {
    console.warn("[Firebase] Failed to initialize official SDK, falling back to local store:", err);
  }
} else if (process.env.FIRESTORE_EMULATOR_HOST) {
  try {
    admin.initializeApp({ projectId: "demo-chat" });
    firestoreDb = admin.firestore();
    console.log("[Firebase] Initialized with Firestore Emulator");
  } catch (err) {
    console.warn("[Firebase] Emulator connection failed:", err);
  }
}

// In-memory store fallback so the server runs out-of-the-box in local/evaluation environments
interface InMemoryStore {
  messages: Map<string, Map<string, MessageDocument>>;
  lastSeen: Map<string, Map<string, LastSeenDocument>>;
}

const memoryStore: InMemoryStore = {
  messages: new Map(),
  lastSeen: new Map(),
};

export const firestoreService = {
  async addMessage(chatId: string, senderId: string, text: string): Promise<MessageDocument> {
    const messageId = randomUUID();
    const now = new Date().toISOString();

    if (firestoreDb) {
      const docRef = firestoreDb
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .doc(messageId);

      const data = {
        id: messageId,
        chatId,
        senderId,
        text,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isEdited: false,
        editedAt: null,
        isDeleted: false,
        deletedAt: null,
        readBy: {
          [senderId]: now,
        },
      };

      await docRef.set(data);

      return {
        id: messageId,
        chatId,
        senderId,
        text,
        createdAt: now,
        isEdited: false,
        editedAt: null,
        isDeleted: false,
        deletedAt: null,
        readBy: { [senderId]: now },
      };
    }

    // Memory fallback
    if (!memoryStore.messages.has(chatId)) {
      memoryStore.messages.set(chatId, new Map());
    }

    const message: MessageDocument = {
      id: messageId,
      chatId,
      senderId,
      text,
      createdAt: now,
      isEdited: false,
      editedAt: null,
      isDeleted: false,
      deletedAt: null,
      readBy: { [senderId]: now },
    };

    memoryStore.messages.get(chatId)!.set(messageId, message);
    return message;
  },

  async getMessage(chatId: string, messageId: string): Promise<MessageDocument | null> {
    if (firestoreDb) {
      const doc = await firestoreDb
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .doc(messageId)
        .get();

      if (!doc.exists) return null;
      const data = doc.data()!;
      let createdAt = new Date().toISOString();
      if (data.createdAt && typeof data.createdAt.toDate === "function") {
        createdAt = data.createdAt.toDate().toISOString();
      } else if (typeof data.createdAt === "string") {
        createdAt = data.createdAt;
      }

      let editedAt: string | null = null;
      if (data.editedAt && typeof data.editedAt.toDate === "function") {
        editedAt = data.editedAt.toDate().toISOString();
      } else if (typeof data.editedAt === "string") {
        editedAt = data.editedAt;
      }

      let deletedAt: string | null = null;
      if (data.deletedAt && typeof data.deletedAt.toDate === "function") {
        deletedAt = data.deletedAt.toDate().toISOString();
      } else if (typeof data.deletedAt === "string") {
        deletedAt = data.deletedAt;
      }

      return {
        id: doc.id,
        chatId: data.chatId || chatId,
        senderId: data.senderId,
        text: data.text,
        createdAt,
        isEdited: Boolean(data.isEdited),
        editedAt,
        isDeleted: Boolean(data.isDeleted),
        deletedAt,
        readBy: data.readBy || {},
      };
    }

    const chatMessages = memoryStore.messages.get(chatId);
    return chatMessages?.get(messageId) || null;
  },

  async editMessage(chatId: string, messageId: string, text: string): Promise<MessageDocument> {
    const now = new Date().toISOString();

    if (firestoreDb) {
      const docRef = firestoreDb
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .doc(messageId);

      await docRef.update({
        text,
        isEdited: true,
        editedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const updated = await this.getMessage(chatId, messageId);
      return updated!;
    }

    const chatMessages = memoryStore.messages.get(chatId);
    const msg = chatMessages?.get(messageId);
    if (!msg) {
      throw new Error("Message not found");
    }

    msg.text = text;
    msg.isEdited = true;
    msg.editedAt = now;
    return { ...msg };
  },

  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    const now = new Date().toISOString();

    if (firestoreDb) {
      const docRef = firestoreDb
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .doc(messageId);

      await docRef.update({
        text: "This message was deleted",
        isDeleted: true,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    const chatMessages = memoryStore.messages.get(chatId);
    const msg = chatMessages?.get(messageId);
    if (msg) {
      msg.text = "This message was deleted";
      msg.isDeleted = true;
      msg.deletedAt = now;
    }
  },

  async getMessages(chatId: string, limitCount = 50): Promise<MessageDocument[]> {
    if (firestoreDb) {
      const snapshot = await firestoreDb
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .orderBy("createdAt", "asc")
        .limit(limitCount)
        .get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        let createdAt = new Date().toISOString();
        if (data.createdAt && typeof data.createdAt.toDate === "function") {
          createdAt = data.createdAt.toDate().toISOString();
        } else if (typeof data.createdAt === "string") {
          createdAt = data.createdAt;
        }

        let editedAt: string | null = null;
        if (data.editedAt && typeof data.editedAt.toDate === "function") {
          editedAt = data.editedAt.toDate().toISOString();
        } else if (typeof data.editedAt === "string") {
          editedAt = data.editedAt;
        }

        let deletedAt: string | null = null;
        if (data.deletedAt && typeof data.deletedAt.toDate === "function") {
          deletedAt = data.deletedAt.toDate().toISOString();
        } else if (typeof data.deletedAt === "string") {
          deletedAt = data.deletedAt;
        }

        return {
          id: doc.id,
          chatId: data.chatId || chatId,
          senderId: data.senderId,
          text: data.text,
          createdAt,
          isEdited: Boolean(data.isEdited),
          editedAt,
          isDeleted: Boolean(data.isDeleted),
          deletedAt,
          readBy: data.readBy || {},
        };
      });
    }

    // Memory fallback
    const chatMessages = memoryStore.messages.get(chatId);
    if (!chatMessages) return [];

    const messages = Array.from(chatMessages.values());
    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return messages.slice(0, limitCount);
  },

  async markMessageRead(chatId: string, messageId: string, userId: string): Promise<void> {
    const now = new Date().toISOString();

    if (firestoreDb) {
      const docRef = firestoreDb
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .doc(messageId);

      await docRef.update({
        [`readBy.${userId}`]: now,
      });
      return;
    }

    // Memory fallback
    const chatMessages = memoryStore.messages.get(chatId);
    const message = chatMessages?.get(messageId);
    if (message) {
      message.readBy[userId] = now;
    }
  },

  async updateLastSeen(chatId: string, userId: string, messageId: string): Promise<void> {
    const now = new Date().toISOString();

    if (firestoreDb) {
      const docRef = firestoreDb
        .collection("chats")
        .doc(chatId)
        .collection("lastSeen")
        .doc(userId);

      await docRef.set(
        {
          userId,
          messageId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return;
    }

    // Memory fallback
    if (!memoryStore.lastSeen.has(chatId)) {
      memoryStore.lastSeen.set(chatId, new Map());
    }

    memoryStore.lastSeen.get(chatId)!.set(userId, {
      userId,
      messageId,
      updatedAt: now,
    });
  },
};
