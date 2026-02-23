const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const colors = require("colors");
const connectDB = require("./config/db");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Load environment variables
dotenv.config({ path: "./config/config.env" });

// Connect to the database
connectDB();

// =================== RATE LIMITING ===================

// Global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Higher limit for non-production
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for auth routes (login)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Higher limit for non-production
  message: "Too many login attempts, please try again after 15 minutes.",
  skipSuccessfulRequests: true,
});

app.use(express.json()); // Parse JSON
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded
app.use(morgan("dev")); // Logger
app.use(cookieParser()); // Cookies
app.use(helmet()); // Security headers
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : [],
    credentials: true,
  })
);

// Custom security middleware
app.use((req, res, next) => {
  const skipFields = ["email", "username", "password", "mediaUrl", "profilePicture"];

  const sanitize = (obj) => {
    if (obj && typeof obj === "object") {
      for (const key in obj) {
        if (skipFields.includes(key)) continue;

        if (typeof obj[key] === "string") {
          obj[key] = obj[key].replace(/\$/g, "");
          if (!obj[key].includes("@") && !obj[key].startsWith("http")) {
            obj[key] = obj[key].replace(/</g, "&lt;").replace(/>/g, "&gt;");
          }
        } else if (typeof obj[key] === "object") {
          sanitize(obj[key]);
        }
      }
    }
    return obj;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.params) req.params = sanitize(req.params);

  next();
});

// Apply global rate limiter only outside development
if (process.env.NODE_ENV !== "development") {
  app.use(limiter);
}

// ✅ Serve static files
app.use("/public", express.static(path.join(__dirname, "public")));

// =================== ROUTES ===================

// Customer routes
const customerRoutes = require("./routes/customer_route");

// ✅ Community routes
const communityRoutes = require("./routes/community_route");

// ✅ Post routes
const postRoutes = require("./routes/post_route");

// Apply stricter limiter only to login route
app.use("/community/customers/login", authLimiter);

// Customer endpoints
app.use("/community/customers", customerRoutes);

// Community endpoints
app.use("/community/communities", communityRoutes);

// Post endpoints
app.use("/community/posts", postRoutes);

// =================== ERROR HANDLER ===================
app.use(errorHandler);

// =================== START SERVER ===================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`
      .green.bold.underline
  );
});