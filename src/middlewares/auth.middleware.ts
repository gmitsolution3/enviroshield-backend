import { fromNodeHeaders } from "better-auth/node";
import { NextFunction, Request, Response } from "express";
import { auth } from "../config/auth";

export interface AuthenticatedRequest extends Request {
  user?: typeof auth.$Infer.Session.user;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Authentication required",
      });
    }

    if (!session.user.emailVerified) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message:
          "Please verify your email before accessing this resource",
      });
    }

    req.user = session.user;

    next();
  } catch (error) {
    next(error);
  }
};
