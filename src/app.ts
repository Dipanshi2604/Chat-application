import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chat.routes.js";
import userRoutes from "./routes/user.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use("/chat", chatRoutes);
app.use("/user", userRoutes);

// Centralized error handling
app.use(errorHandler);

export default app;
