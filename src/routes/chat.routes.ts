import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { chatService } from "../services/chat.service.js";
import { messageService } from "../services/message.service.js";
import { validate } from "../middlewares/validate.js";

const router = Router();

// 1. Create or Get 1:1 Chat
const createChatSchema = z.object({
  body: z.object({
    userAId: z.string().min(1, "userAId is required"),
    userBId: z.string().min(1, "userBId is required"),
  }),
});

router.post(
  "/create",
  validate(createChatSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userAId, userBId } = req.body;
      const result = await chatService.createOrGetChat(userAId, userBId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Create Group Chat
const createGroupSchema = z.object({
  body: z.object({
    title: z.string().min(1, "title is required"),
    adminId: z.string().min(1, "adminId is required"),
    memberIds: z.array(z.string()).min(1, "at least one memberId is required"),
  }),
});

router.post(
  "/group/create",
  validate(createGroupSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, adminId, memberIds } = req.body;
      const result = await chatService.createGroupChat(title, adminId, memberIds);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Add Group Member
const addMemberSchema = z.object({
  params: z.object({
    chatId: z.string().min(1),
  }),
  body: z.object({
    requestingUserId: z.string().min(1, "requestingUserId is required"),
    userId: z.string().min(1, "userId is required"),
  }),
});

router.post(
  "/:chatId/members/add",
  validate(addMemberSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chatId = req.params.chatId as string;
      const { requestingUserId, userId } = req.body;
      const result = await chatService.addGroupMember(chatId, requestingUserId, userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Remove Group Member
const removeMemberSchema = z.object({
  params: z.object({
    chatId: z.string().min(1),
  }),
  body: z.object({
    requestingUserId: z.string().min(1, "requestingUserId is required"),
    userId: z.string().min(1, "userId is required"),
  }),
});

router.post(
  "/:chatId/members/remove",
  validate(removeMemberSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chatId = req.params.chatId as string;
      const { requestingUserId, userId } = req.body;
      const result = await chatService.removeGroupMember(chatId, requestingUserId, userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// 2. Send Message
const sendMessageSchema = z.object({
  params: z.object({
    chatId: z.string().min(1),
  }),
  body: z.object({
    senderId: z.string().min(1, "senderId is required"),
    text: z.string().min(1, "text is required"),
  }),
});

router.post(
  "/:chatId/message/send",
  validate(sendMessageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chatId = req.params.chatId as string;
      const { senderId, text } = req.body;
      const message = await messageService.sendMessage(chatId, senderId, text);
      res.status(201).json(message);
    } catch (err) {
      next(err);
    }
  }
);

// Edit Message
const editMessageSchema = z.object({
  params: z.object({
    chatId: z.string().min(1),
    messageId: z.string().min(1),
  }),
  body: z.object({
    userId: z.string().min(1, "userId is required"),
    text: z.string().min(1, "text is required"),
  }),
});

router.patch(
  "/:chatId/message/:messageId",
  validate(editMessageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chatId = req.params.chatId as string;
      const messageId = req.params.messageId as string;
      const { userId, text } = req.body;
      const updatedMessage = await messageService.editMessage(chatId, messageId, userId, text);
      res.status(200).json(updatedMessage);
    } catch (err) {
      next(err);
    }
  }
);

// Delete Message
const deleteMessageSchema = z.object({
  params: z.object({
    chatId: z.string().min(1),
    messageId: z.string().min(1),
  }),
  body: z.object({
    userId: z.string().min(1, "userId is required"),
  }),
});

router.delete(
  "/:chatId/message/:messageId",
  validate(deleteMessageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chatId = req.params.chatId as string;
      const messageId = req.params.messageId as string;
      const { userId } = req.body;
      await messageService.deleteMessage(chatId, messageId, userId);
      res.status(200).json({ success: true, messageId });
    } catch (err) {
      next(err);
    }
  }
);

// 3. Get Messages
const getMessagesSchema = z.object({
  params: z.object({
    chatId: z.string().min(1),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

router.get(
  "/:chatId/messages",
  validate(getMessagesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chatId = req.params.chatId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const messages = await messageService.getMessages(chatId, limit);
      res.status(200).json({ messages });
    } catch (err) {
      next(err);
    }
  }
);

// 4. Mark Message Read
const markReadSchema = z.object({
  params: z.object({
    chatId: z.string().min(1),
    messageId: z.string().min(1),
  }),
  body: z.object({
    userId: z.string().min(1, "userId is required"),
  }),
});

router.post(
  "/:chatId/message/:messageId/read",
  validate(markReadSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chatId = req.params.chatId as string;
      const messageId = req.params.messageId as string;
      const { userId } = req.body;
      await messageService.markMessageRead(chatId, messageId, userId);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

// 5. Update Last Seen Message
const lastSeenSchema = z.object({
  params: z.object({
    chatId: z.string().min(1),
  }),
  body: z.object({
    userId: z.string().min(1, "userId is required"),
    messageId: z.string().min(1, "messageId is required"),
  }),
});

router.post(
  "/:chatId/lastseen",
  validate(lastSeenSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chatId = req.params.chatId as string;
      const { userId, messageId } = req.body;
      await messageService.updateLastSeen(chatId, userId, messageId);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
