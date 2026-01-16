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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Rate limiter for auth routes (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: "Too many login attempts, please try again after 15 minutes.",
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Middleware
app.use(express.json());
app.use(morgan("dev")); // Logging middleware
app.use(cookieParser()); // Cookie parser middleware

// Custom security middleware (compatible with Express v5)
app.use((req, res, next) => {
  // Fields that should not be sanitized (emails, URLs, etc.)
  const skipFields = [
    "email",
    "username",
    "password",
  ];

  const sanitize = (obj, parentKey = "") => {
    if (obj && typeof obj === "object") {
      for (const key in obj) {
        // Skip sanitization for specific fields
        if (skipFields.includes(key)) {
          continue;
        }

        if (typeof obj[key] === "string") {
          // Prevent NoSQL injection - Remove $ from strings (but keep .)
          obj[key] = obj[key].replace(/\$/g, "");

          // Prevent XSS attacks - Only escape HTML in text fields, not emails/URLs
          if (!obj[key].includes("@") && !obj[key].startsWith("http")) {
            obj[key] = obj[key].replace(/</g, "&lt;").replace(/>/g, "&gt;");
          }
        } else if (typeof obj[key] === "object") {
          sanitize(obj[key], key);
        }
      }
    }
    return obj;
  };

  if (req.body) req.body = sanitize(req.body);
  // Note: req.params and req.query are read-only in Express v5, so we skip them

  next();
});

app.use(helmet()); // Security middleware
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Configure CORS
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
      : [];
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions)); // Enable CORS with options

app.use(limiter); // Apply rate limiting to all requests
app.use(express.static(path.join(__dirname, "public"))); // Serve static files

// // Routes
// const batchRoutes = require("./routes/batch_route");
// app.use("/api/v1/batches", batchRoutes);

// const categoryRoutes = require("./routes/category_route");
// app.use("/api/v1/categories", categoryRoutes);

// Apply stricter rate limiting to login endpoint
const customerRoutes = require("./routes/customer");
app.use("/community/customers/login", authLimiter);
app.use("/community/customers", customerRoutes);

// const itemRoutes = require("./routes/item_route");
// app.use("/api/v1/items", itemRoutes);

// const commentRoutes = require("./routes/comment_route");
// app.use("/api/v1/comments", commentRoutes);

// const userRoutes = require("./routes/userRoutes");
// const productRoutes = require("./routes/productRoutes");
// const orderRoutes = require("./routes/orderRoutes");
// const paymentRoutes = require("./routes/paymentRoutes");
// app.use("/api/v1/users", userRoutes);
// app.use("/api/v1/products", productRoutes);
// app.use("/api/v1/orders", orderRoutes);
// app.use("/api/v1/payments", paymentRoutes);

// Error handling middleware
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.green.bold
      .underline
  );
});
