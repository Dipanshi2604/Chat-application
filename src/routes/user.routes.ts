import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { chatService } from "../services/chat.service.js";
import { validate } from "../middlewares/validate.js";

const router = Router();

const getUserChatsSchema = z.object({
  params: z.object({
    userId: z.string().min(1, "userId is required"),
  }),
});

// 6. List User Chats
router.get(
  "/:userId/chats",
  validate(getUserChatsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.userId as string;
      const chats = await chatService.getUserChats(userId);
      res.status(200).json({ chats });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
