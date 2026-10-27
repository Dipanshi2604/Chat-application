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
        isGroup: false,
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
        isGroup: false,
        members: {
          create: [{ userId: userAId }, { userId: userBId }],
        },
      },
      select: { id: true },
    });

    return { chatId: newChat.id };
  },

  async createGroupChat(title: string, adminId: string, memberIds: string[]) {
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin) {
      throw new AppError("Admin user not found", 404);
    }

    const uniqueMemberIds = Array.from(new Set(memberIds.filter((id) => id !== adminId)));
    const foundMembers = await prisma.user.findMany({
      where: { id: { in: uniqueMemberIds } },
      select: { id: true },
    });

    if (foundMembers.length !== uniqueMemberIds.length) {
      throw new AppError("One or more group members not found", 404);
    }

    const newGroup = await prisma.chat.create({
      data: {
        isGroup: true,
        title,
        members: {
          create: [
            { userId: adminId, role: "ADMIN" },
            ...uniqueMemberIds.map((userId) => ({ userId, role: "MEMBER" })),
          ],
        },
      },
      include: {
        members: {
          select: { userId: true, role: true },
        },
      },
    });

    return {
      chatId: newGroup.id,
      title: newGroup.title,
      isGroup: true,
      members: newGroup.members,
    };
  },

  async addGroupMember(chatId: string, requestingUserId: string, userId: string) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: true },
    });

    if (!chat) {
      throw new AppError("Chat not found", 404);
    }

    if (!chat.isGroup) {
      throw new AppError("Cannot add members to a 1:1 chat", 400);
    }

    const requester = chat.members.find((m) => m.userId === requestingUserId);
    if (!requester || requester.role !== "ADMIN") {
      throw new AppError("Only group admins can add members", 403);
    }

    const userToAdd = await prisma.user.findUnique({ where: { id: userId } });
    if (!userToAdd) {
      throw new AppError("User to add not found", 404);
    }

    const alreadyMember = chat.members.some((m) => m.userId === userId);
    if (alreadyMember) {
      throw new AppError("User is already a member of this group", 400);
    }

    await prisma.chatMember.create({
      data: {
        chatId,
        userId,
        role: "MEMBER",
      },
    });

    return { success: true, addedUserId: userId };
  },

  async removeGroupMember(chatId: string, requestingUserId: string, userId: string) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: true },
    });

    if (!chat) {
      throw new AppError("Chat not found", 404);
    }

    if (!chat.isGroup) {
      throw new AppError("Cannot remove members from a 1:1 chat", 400);
    }

    const requester = chat.members.find((m) => m.userId === requestingUserId);
    if (!requester) {
      throw new AppError("Requesting user is not in this chat", 403);
    }

    const isSelfRemoval = requestingUserId === userId;
    const isAdmin = requester.role === "ADMIN";

    if (!isAdmin && !isSelfRemoval) {
      throw new AppError("Only admins can remove other members", 403);
    }

    const targetMember = chat.members.find((m) => m.userId === userId);
    if (!targetMember) {
      throw new AppError("User is not a member of this chat", 404);
    }

    await prisma.chatMember.delete({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
    });

    return { success: true, removedUserId: userId };
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
          select: { userId: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return chats.map((chat) => ({
      chatId: chat.id,
      isGroup: chat.isGroup,
      title: chat.title,
      createdAt: chat.createdAt,
      memberIds: chat.members.map((m) => m.userId),
      members: chat.members,
    }));
  },
};
