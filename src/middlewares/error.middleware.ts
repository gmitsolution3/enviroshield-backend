import { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let statusCode = 500;
  let status = "error";
  let message = "Something went wrong!";
  let errorSources: { path: string | number; message: string }[] = [];

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    status = "fail";
  } else if (err instanceof ZodError) {
    statusCode = 400;
    status = "fail";
    message = "Validation Error";
    errorSources = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    status = "fail";
    message = "Validation Error";

    errorSources = Object.values(err.errors).map((error) => ({
      path: error.path,
      message: error.message,
    }));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    status = "fail";
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err?.code === 11000) {
    statusCode = 400;
    status = "fail";
    message = "Duplicate field value";
  } else if (err instanceof Error) {
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    status,
    message,
    errorSources,
  });
};

export default errorHandler;
