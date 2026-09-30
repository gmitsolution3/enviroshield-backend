import type { auth } from "../config/auth";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export {};
