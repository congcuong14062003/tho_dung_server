import auth from "./auth.route.js";
import user from "./user.router.js";
export default function RouterMain(app) {
  app.use("/auth", auth);
  app.use("/users", user);
  return app;
}