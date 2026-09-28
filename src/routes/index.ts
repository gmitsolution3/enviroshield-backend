import { Router } from "express";
import healthRoutes from "../modules/health/health.route";

const router = Router();

const moduleRoutes: {
  path: string;
  route: Router;
}[] = [
  {
    path: "/health",
    route: healthRoutes,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
