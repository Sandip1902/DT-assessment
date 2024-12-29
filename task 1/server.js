const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = 3000;

// MongoDB Configuration
const mongoUri = "mongodb://localhost:27017"; // Default MongoDB URI
const client = new MongoClient(mongoUri);
let db;

// Middleware
app.use(express.json()); // Parse JSON payloads
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded payloads

// File upload configuration using Multer
const upload = multer({ dest: "uploads/" });

// Initialize MongoDB Connection
async function initializeDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");
    db = client.db("event_management"); // Database name
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}
initializeDB();

// Routes

// 1. Get an event by ID
app.get("/api/v3/app/events", async (req, res) => {
  const { id } = req.query;

  try {
    if (!id) {
      return res.status(400).json({ message: "Event ID is required" });
    }

    const event = await db.collection("events").findOne({ _id: new ObjectId(id) });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 2. Get paginated events
app.get("/api/v3/app/events", async (req, res) => {
  const { type, limit = 5, page = 1 } = req.query;

  try {
    const query = type === "latest" ? {} : null;
    const events = await db
      .collection("events")
      .find(query)
      .sort({ schedule: -1 })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .toArray();

    res.status(200).json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 3. Create an event
app.post("/api/v3/app/events", upload.single("files[image]"), async (req, res) => {
  try {
    const {
      name,
      tagline,
      schedule,
      description,
      moderator,
      category,
      sub_category,
      rigor_rank,
    } = req.body;

    if (!name || !tagline || !schedule || !description || !moderator || !category || !sub_category || !rigor_rank) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newEvent = {
      name,
      tagline,
      schedule: new Date(schedule),
      description,
      files: { image: req.file ? req.file.path : null },
      moderator,
      category,
      sub_category,
      rigor_rank: parseInt(rigor_rank),
      attendees: [],
    };

    const result = await db.collection("events").insertOne(newEvent);
    res.status(201).json({ eventId: result.insertedId });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 4. Update an event
app.put("/api/v3/app/events/:id", upload.single("files[image]"), async (req, res) => {
  const { id } = req.params;

  try {
    const {
      name,
      tagline,
      schedule,
      description,
      moderator,
      category,
      sub_category,
      rigor_rank,
    } = req.body;

    const updateFields = {
      ...(name && { name }),
      ...(tagline && { tagline }),
      ...(schedule && { schedule: new Date(schedule) }),
      ...(description && { description }),
      ...(moderator && { moderator }),
      ...(category && { category }),
      ...(sub_category && { sub_category }),
      ...(rigor_rank && { rigor_rank: parseInt(rigor_rank) }),
      ...(req.file && { "files.image": req.file.path }),
    };

    const result = await db.collection("events").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({ message: "Event updated successfully" });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 5. Delete an event
app.delete("/api/v3/app/events/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.collection("events").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Start the Server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
