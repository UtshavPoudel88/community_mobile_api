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

// Load env variables
dotenv.config({ path: "./config/config.env" });

// Connect to MongoDB
connectDB();

//  Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
});

//  Body Parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

//  STATIC FILES (THIS IS THE FIX)
// Files inside /public will be accessible directly
// Example:
// public/profile_picture/test.jpg
// URL → http://localhost:3000/profile_picture/test.jpg

app.use(express.static(path.join(__dirname, "public")));

//  Middleware
app.use(morgan("dev"));
app.use(cookieParser());
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(limiter);

//  Routes
const customerRoutes = require("./routes/customer");

app.use("/community/customers/login", authLimiter);
app.use("/community/customers", customerRoutes);

//  Error Handler
app.use(errorHandler);

//  Start Server

const PORT = process.env.PORT || 3000;

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

