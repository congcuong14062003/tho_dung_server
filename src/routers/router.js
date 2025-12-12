import auth from "./auth.route.js";
import user from "./user.router.js";
import category from "./category.route.js";
import sevice from "./service.router.js";  
import tech from "./technician.route.js";
import request from "./request.routes.js";
import upload from "./media.route.js";
import payment from './payment.route.js';
import test from "./test.route.js"; // ⭐ import router test
import notification from "./notification.route.js";
import message from "./message.router.js"

export default function RouterMain(app) {
  app.use("/auth", auth);
  app.use("/users", user)
  app.use("/categories", category);
  app.use("/services", sevice );
  app.use("/technicians", tech);
  app.use("/requests", request);
  app.use("/upload", upload);
  app.use("/payments", payment)
  app.use("/notifications", notification)
  app.use("/messsages", message)



  app.use("/test", test); // ⭐ router test
  return app;
}