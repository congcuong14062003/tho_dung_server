import express from "express";
import { CategoryController } from "../controllers/category.controller.js";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { TechnicianController } from "../controllers/technician.controller.js";

const router = express.Router();
router.post(
  "/get-all-woker",
  verifyToken,
  authorizeRoles("admin"),
  TechnicianController.getAllTechnicians
);


export default router;
