const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;



app.get("/", (req, res) => {
    res.send("Running my server");
});

app.listen(port, () => {
    console.log("listining to port", port);
});