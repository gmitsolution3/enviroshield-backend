import type { auth } from "../config/auth";

declare global {
  namespace Express {
    interface Request {
      user?: typeof auth.$Infer.Session.user;
    }
  }
}

export {};
