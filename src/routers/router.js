import auth from "./auth.route.js";
import user from "./user.router.js";
import category from "./category.route.js";
import sevice from "./service.router.js";
import tech from "./technician.route.js";
import request from "./request.routes.js";
export default function RouterMain(app) {
  app.use("/auth", auth);
  app.use("/users", user)
  app.use("/categories", category);
  app.use("/services", sevice);
  app.use("/technicians", tech);
  app.use("/requests", request);
  return app;
}