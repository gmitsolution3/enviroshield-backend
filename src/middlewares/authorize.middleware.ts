import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "./auth.middleware";

export const authorize = (requiredRole: "user" | "admin") => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Authentication required",
      });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You are not authorized to access this resource",
      });
    }

    next();
  };
};
