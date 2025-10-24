import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();

// Import routes
// import authRoutes from "./routes/auth.routes.js";
// import customerRoutes from "./routes/customer.routes.js";
// import workerRoutes from "./routes/worker.routes.js";
// import serviceRoutes from "./routes/service.routes.js";
// import requestRoutes from "./routes/request.routes.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/customers", customerRoutes);
// app.use("/api/workers", workerRoutes);
// app.use("/api/services", serviceRoutes);
// app.use("/api/requests", requestRoutes);

export default app;
