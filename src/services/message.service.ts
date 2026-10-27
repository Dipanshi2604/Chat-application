import { firestoreService } from "../firebase.js";
import { chatService } from "./chat.service.js";
import { AppError } from "../errors/AppError.js";
import { MessageDocument } from "../types/chat.js";

export const messageService = {
  async sendMessage(chatId: string, senderId: string, text: string): Promise<MessageDocument> {
    const isMember = await chatService.isMember(chatId, senderId);
    if (!isMember) {
      throw new AppError("Sender is not a member of this chat", 403);
    }

    return firestoreService.addMessage(chatId, senderId, text);
  },

  async getMessages(chatId: string, limitCount = 50): Promise<MessageDocument[]> {
    return firestoreService.getMessages(chatId, limitCount);
  },

  async markMessageRead(chatId: string, messageId: string, userId: string): Promise<void> {
    const isMember = await chatService.isMember(chatId, userId);
    if (!isMember) {
      throw new AppError("User is not a member of this chat", 403);
    }

    await firestoreService.markMessageRead(chatId, messageId, userId);
  },

  async updateLastSeen(chatId: string, userId: string, messageId: string): Promise<void> {
    const isMember = await chatService.isMember(chatId, userId);
    if (!isMember) {
      throw new AppError("User is not a member of this chat", 403);
    }

    await firestoreService.updateLastSeen(chatId, userId, messageId);
  },
};
