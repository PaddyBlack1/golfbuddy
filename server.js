const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

// serve all static files in this folder (index.html, app.js, etc)
app.use(express.static(__dirname));

// default route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => console.log("Running on", PORT));
