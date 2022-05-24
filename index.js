const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

//middleware
app.use(cors());
app.use(express.json());

//verify token
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "Unauthorized Access" });
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: "Forbidden Access" });
        }
        req.decoded = decoded;
        next();
    });
}

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
        const orderCollection = client.db("x-parts").collection("orders");
        const ratingCollection = client.db("x-parts").collection("comments");
        const userCollection = client.db("x-parts").collection("users");
        const paymentCollection = client.db("x-parts").collection("payments");
        console.log("db connected");

        // For using JWT
        app.post("/login", (req, res) => {
            const email = req.body;
            const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: "1d",
            });
            res.send({ token });
        });

        //check admin or not
        app.get("/admin/:email", async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === "admin";
            res.send({ admin: isAdmin });
        });

        //make an admin
        app.put("/user/admin/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({
                email: requester,
            });
            if (requesterAccount.role === "admin") {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: "admin" },
                };
                const result = await userCollection.updateOne(
                    filter,
                    updateDoc
                );
                res.send(result);
            } else {
                res.status(403).send({ message: "forbidden" });
            }
        });

        //Update user
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const user = req.body;
            const options = { upsert: true };
            const updateInfo = {
                $set: user,
            };
            const result = await userCollection.updateOne(
                filter,
                updateInfo,
                options
            );
            const token = jwt.sign(
                { email: email },
                process.env.ACCESS_TOKEN_SECRET,
                {
                    expiresIn: "1d",
                }
            );
            res.send({ result, token });
        });

        //Load a single user for a perticular email
        app.get("/user/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await userCollection.findOne(query);
            res.send(result);
        });

        //get all user
        app.get("/user", verifyToken, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });


        app.post("/create-payment-intent", async (req, res) => {
            const getOrder = req.body;
            const price = getOrder.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        });

        //Insert product
        app.post("/product",verifyToken, async (req, res) => {
            const getProduct = req.body;
            const result = await productCollection.insertOne(getProduct);
            res.send(result);
        });

        //http://localhost:5000/product
        app.get("/product", async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        //Delete product from database
        app.delete("/product/:id",verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
        });

        //Load order by id
        app.get("/myorder/:id",verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.send(result);
        });

        //delete order data
        app.delete("/myorder/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });

        //personal data (Indevidually) by email
        app.get("/myorders", verifyToken, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                const query = { email };
                const cursor = orderCollection.find(query);
                const myorder = await cursor.toArray();
                res.send(myorder);
            } else {
                res.status(403).send({ message: "Forbidden access" });
            }
        });

        //Load a single product for a perticular id
        app.get("/order/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        });


        //Update order
        app.patch("/order/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const order = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: order.transactionId,
                },
            };

            const result = await paymentCollection.insertOne(payment);
            const updatedBooking = await orderCollection.updateOne(
                filter,
                updatedDoc
            );
            res.send(updatedBooking);
        });

        //http://localhost:5000/rating
        //get all rating
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

        //Post an order to database
        app.post("/order", async (req, res) => {
            const getOrder = req.body;
            const result = await orderCollection.insertOne(getOrder);
            res.send(result);
        });

        //get all orders
        app.get("/orders", verifyToken, async (req, res) => {
            const orders = await orderCollection.find().toArray();
            res.send(orders);
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
