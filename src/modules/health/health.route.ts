import { Router } from "express";
import healthController from "./health.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

router.get("/", healthController);

router.get("/protected", authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authentication successful",
    user: req.user,
  });
});


export default router;
