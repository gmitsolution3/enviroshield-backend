import { Router } from "express";
import blogRoutes from "../modules/blog/blog.route";
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
  {
    path: "/blog",
    route: blogRoutes,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
