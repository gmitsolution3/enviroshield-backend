/// <reference path="./types/express.d.ts" />

import cors from "cors";
import express from "express";
import errorHandler from "./middlewares/error.middleware";
import router from "./routes";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://enviroshield.vercel.app"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/v1", router);

app.use(errorHandler);

export default app;