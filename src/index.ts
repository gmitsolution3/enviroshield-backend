/// <reference path="./types/express.d.ts" />

import app from "./app";
import config from "./config";
import connectDB from "./config/database";

async function startServer() {
  try {
    await connectDB();

    const server = app.listen(config.port, () => {
      console.log(`app is listening to port ${config.port}`);
    });

    process.on("unhandledRejection", (error) => {
      console.log(error);
      server.close(() => {
        process.exit(1);
      });
    });
  } catch (error) {
    console.error("failed to start server", error);
    process.exit(1);
  }
}

startServer();
