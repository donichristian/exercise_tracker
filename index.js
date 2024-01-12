// Import necessary modules
const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const { Schema } = mongoose;

// Connect to MongoDB using the provided URI from the environment variables
mongoose.connect(process.env.MONGO_URI);

// Define a MongoDB schema for users
const UserSchema = new Schema({
  username: String,
});
const User = mongoose.model("User", UserSchema);

// Define a MongoDB schema for exercises
const ExerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});
const Exercise = mongoose.model("Exercise", ExerciseSchema);

// Middleware setup
app.use(cors()); // Enable Cross-Origin Resource Sharing (CORS)
app.use(express.static("public")); // Serve static files from the 'public' directory
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve the homepage
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// API endpoint to get all users
app.get("/api/users", async (req, res) => {
  // Fetch all users from the User collection in the database
  const users = await User.find({}).select("_id username");

  // Check if there are no users found
  if (!users) {
    // If there are no users, send a response with the message "No users"
    res.send("No users");
  } else {
    // If there are users, send a JSON response with the users data
    res.json(users);
  }
});

// API endpoint to create a new user
app.post("/api/users", async (req, res) => {
  // Log the request body to the console
  console.log(req.body);

  // Create a new User object with the username from the request body
  const userObj = new User({
    username: req.body.username,
  });

  try {
    // Save the user object to the database
    const user = await userObj.save();

    // Log the saved user object to the console
    console.log(user);

    // Respond with the saved user object as JSON
    res.json(user);
  } catch (err) {
    // Log any errors that occur during the save operation
    console.log(err);
  }
});

// API endpoint to add an exercise for a specific user
app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    // Extract the _id parameter from the request URL
    const { _id } = req.params;
    // Extract the description, duration, and date from the request body
    const { description, duration, date } = req.body;

    // Find the user with the given _id
    const user = await User.findById(_id);

    // If the user is not found, return a 404 status code with an error message
    if (!user) {
      return res.status(404).send("Could not find user");
    }

    // Create a new exercise object with the user's _id, description, duration, and date
    const exerciseObj = new Exercise({
      user_id: user._id,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    });

    // Save the exercise object to the database
    const exercise = await exerciseObj.save();

    // Return a JSON response with the user's _id, username, exercise description, duration, and formatted date
    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(),
    });
  } catch (err) {
    // If there's an error, log the error and return a 500 status code with an error message
    console.log(err);
    res.status(500).send("There was an error saving the exercise");
  }
});

// API endpoint to get exercise logs for a specific user
app.get("/api/users/:_id/logs", async (req, res) => {
  // Get the query parameters from the request
  const { from, to, limit } = req.query;
  // Get the user id from the request parameters
  const id = req.params._id;
  // Find the user with the given id
  const user = await User.findById(id).select("username");
  // If user is not found, send a response with an error message
  if (!user) {
    res.send("Could not find user");
    return;
  }

  // Create an empty object to store the date filters
  let dateObj = {};
  // If "from" parameter is provided, add a greater than or equal to filter to dateObj
  if (from) {
    dateObj["$gte"] = new Date(from);
  }
  // If "to" parameter is provided, add a less than or equal to filter to dateObj
  if (to) {
    dateObj["$lte"] = new Date(to);
  }
  // Create a filter object with the user id
  let filter = {
    user_id: id,
  };
  // If "from" or "to" parameter is provided, add the date filter to the filter object
  if (from || to) {
    filter.date = dateObj;
  }

  // Find exercises that match the filter and limit the result to the specified limit or default to 500
  const exercises = await Exercise.find(filter)
    .lean()
    .limit(+limit ?? 500);

  // Map the exercises to a new array with selected properties
  const log = exercises.map((e) => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString(),
  }));

  // Send a response with the user information and exercise log
  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log,
  });
});

// Start the server and listen on the specified port
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
