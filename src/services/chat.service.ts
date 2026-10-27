import { prisma } from "../db.js";
import { AppError } from "../errors/AppError.js";

export const chatService = {
  async createOrGetChat(userAId: string, userBId: string): Promise<{ chatId: string }> {
    if (userAId === userBId) {
      throw new AppError("Cannot create a chat with yourself", 400);
    }

    const [userA, userB] = await Promise.all([
      prisma.user.findUnique({ where: { id: userAId } }),
      prisma.user.findUnique({ where: { id: userBId } }),
    ]);

    if (!userA || !userB) {
      throw new AppError("One or both users not found", 404);
    }

    // Look for an existing direct chat with both participants
    const existingChat = await prisma.chat.findFirst({
      where: {
        AND: [
          { members: { some: { userId: userAId } } },
          { members: { some: { userId: userBId } } },
        ],
      },
      select: { id: true },
    });

    if (existingChat) {
      return { chatId: existingChat.id };
    }

    // Create chat with both members
    const newChat = await prisma.chat.create({
      data: {
        members: {
          create: [{ userId: userAId }, { userId: userBId }],
        },
      },
      select: { id: true },
    });

    return { chatId: newChat.id };
  },

  async isMember(chatId: string, userId: string): Promise<boolean> {
    const member = await prisma.chatMember.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      select: { id: true },
    });

    return Boolean(member);
  },

  async getUserChats(userId: string) {
    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!userExists) {
      throw new AppError("User not found", 404);
    }

    const chats = await prisma.chat.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          select: { userId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return chats.map((chat) => ({
      chatId: chat.id,
      createdAt: chat.createdAt,
      memberIds: chat.members.map((m) => m.userId),
    }));
  },
};
