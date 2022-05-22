const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d57oo.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});
async function run() {
    try {
        await client.connect();
        const productCollection = client.db("x-parts").collection("products");
        const ratingCollection = client.db("x-parts").collection("comments");
        const userCollection = client.db("x-parts").collection("users");
        console.log("db connected");

        //http://localhost:5000/rating
        app.get("/rating", async (req, res) => {
            const query = {};
            const cursor = ratingCollection.find(query);
            const ratings = await cursor.toArray();
            res.send(ratings);
        });

        //Post rating to database
        app.post("/rating", async (req, res) => {
            const getRating = req.body;
            const result = await ratingCollection.insertOne(getRating);
            res.send(result);
        });
    } finally {
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Running my server");
});

app.listen(port, () => {
    console.log("listining to port", port);
});
