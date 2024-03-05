const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(express.json());

// MongoDB connection and database models
const uri = process.env.MONGO_URI;

mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("Connected to MongoDB");

    // MongoDB User model
    const userSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      phoneNum: {
        type: String,
        required: true,
        match: [/^\d{10}$/, "Phone number must be 10 digits"],
      },
      location: {
        type: String,
        required: true,
        match: [/^\d{5}$/, "Location must be a 5 digit zip code"],
      },
    });

    userSchema.pre("save", async function (next) {
      // Hash the password before saving the user model
      if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 8);
      }
      next();
    });

    // Add a method to the user schema to check password validity
    userSchema.methods.isValidPassword = async function (password) {
      return await bcrypt.compare(password, this.password);
    };

    const User = mongoose.model("User", userSchema);

    // Routes
    app.post("/api/users/signup", async (req, res) => {
      try {
        const { username, password, email, phoneNum, location } = req.body;
        // Check if user already exists
        let existingUser = await User.findOne({
          $or: [{ username }, { email }],
        });
        if (existingUser) {
          return res.status(409).send({ message: "User already exists" });
        }
        // Create a new user and save to database
        const user = new User({
          username,
          password,
          email,
          phoneNum,
          location,
        });
        await user.save();
        // Respond with success
        res.status(201).send({ message: "User created successfully" });
      } catch (error) {
        res
          .status(500)
          .send({ message: "Error creating user", error: error.message });
      }
    });

    app.post("/api/users/login", async (req, res) => {
      try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || !(await user.isValidPassword(password))) {
          return res
            .status(401)
            .send({ message: "Invalid username or password" });
        }
        // Generate a token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
          expiresIn: "24h",
        });
        res.status(200).send({ token });
      } catch (error) {
        res
          .status(500)
          .send({ message: "Error logging in", error: error.message });
      }
    });

    // Testing MongoDB connection
    try {
      const { MongoClient, ServerApiVersion } = require("mongodb");
      const client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
      });
      await client.connect();
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged MongoDB Atlas. Successfully connected!");
      await client.close();
    } catch (error) {
      console.error("Error connecting to MongoDB Atlas:", error);
    }
  })
  .catch((err) => console.error("Could not connect to MongoDB:", err));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
