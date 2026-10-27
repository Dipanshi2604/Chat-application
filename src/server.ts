import app from "./app.js";
import { config } from "./config.js";

const server = app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});

process.on("SIGTERM", () => {
  server.close(() => {
    process.exit(0);
  });
});
