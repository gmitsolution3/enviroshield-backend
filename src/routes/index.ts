import { Router } from "express";
import blogRoutes from "../modules/blog/blog.route";
import cartRoutes from "../modules/cart/cart.route";
import categoryRoutes from "../modules/category/category.route";
import contactRoutes from "../modules/contact/contact.route";
import healthRoutes from "../modules/health/health.route";
import inventoryRoutes from "../modules/inventory/inventory.route";
import orderRoutes from "../modules/order/order.route";
import productRoutes from "../modules/product/product.route";
import projectRoutes from "../modules/project/project.route";
import serviceRoutes from "../modules/service/service.route";
import testimonialRoutes from "../modules/testimonial/testimonial.route";

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
  {
    path: "/category",
    route: categoryRoutes,
  },
  {
    path: "/product",
    route: productRoutes,
  },
  {
    path: "/cart",
    route: cartRoutes,
  },
  {
    path: "/inventory",
    route: inventoryRoutes,
  },
  {
    path: "/order",
    route: orderRoutes,
  },
  { path: "/contact", route: contactRoutes },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
