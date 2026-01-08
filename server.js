const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files (index.html, app.js, etc.)
app.use(express.static(__dirname));

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Fallback for any other route (avoids app.get("*") error)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => console.log("Running on", PORT));
