import { Router } from "express";
import blogRoutes from "../modules/blog/blog.route";
import healthRoutes from "../modules/health/health.route";
import projectRoutes from "../modules/project/project.route";
import serviceRoutes from "../modules/service/service.route";
import testimonialRoutes from "../modules/testimonial/testimonial.route";
import contactRoutes from "../modules/contact/contact.route";

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
  {
    path: "/service",
    route: serviceRoutes,
  },
  {
    path: "/project",
    route: projectRoutes,
  },
  {
    path: "/testimonial",
    route: testimonialRoutes,
  },
  { path: "/contact", route: contactRoutes },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
