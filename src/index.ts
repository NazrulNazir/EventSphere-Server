import { ObjectId } from "mongodb";

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

dotenv.config();
const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }));
// app.use(cors());


const uri = process.env.EVENTSPEHERE_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {

    const db = client.db('EventSphere');
    const allEventsCollection = db.collection('AllEvents');

        // JWKS
    const JWKS = createRemoteJWKSet(
      new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
    );

    // middleware

    const verifyToken = async (req: any, res:any, next:any) => {
      const authHeader = req?.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const token = authHeader.split(" ")[1];
      console.log("Berer sara token : ", token);

      if (!token) {
        return res.status(401).json({ message: "Token Unauthorized" });
      }

      try {
        const { payload } = await jwtVerify(token, JWKS);
        req.user = payload;
        console.log("Payload Successfull: ", payload);
        next();
      } catch (err) {
        console.log(err);
        return res.status(403).json({ message: "Forbidden" });
      }
    };


    // app.get('/test', async(req: any,res: any)=> {
    //     const result = await allEventsCollection .find().toArray();
    // })

    app.post('/events', async (req: any, res: any)=>{
        const events = req.body;
        const result = await allEventsCollection.insertOne(events);
        res.send(result);

    })

    app.get('/dashboard/my-events/:email', verifyToken, async(req: any, res: any)=>{
      const {email} = req.params;
      const result = await allEventsCollection.find({email}).toArray();
      res.send(result);
    })

    app.delete('/dashboard/events/:id', async(req: any, res: any)=>{
      const {id} = req.params;
      const result = await allEventsCollection.deleteOne({_id : new ObjectId(id)});
      res.send(result);
    });

    app.patch('/my-event/:id', async(req: any, res: any)=> {
        const {id} = req.params;
        const updateEvent = req.body;
        const result = await allEventsCollection.updateOne(
          {_id: new ObjectId(id)},
          {
            $set: updateEvent
          }
        )
    })

    app.get(`/my-event/:id`, verifyToken, async(req: any, res: any)=>{
      const {id} = req.params;
      const result = await allEventsCollection.findOne({_id: new ObjectId(id)});
      res.send(result);
    })

    app.get(`/all-events`, async(req: any, res: any)=> {
      const result = await allEventsCollection.find().toArray();
      res.send(result);
    })

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } catch(error) {
    console.log(error)
  }
}
run().catch(console.dir);

app.get("/", (req: any, res: any) => {
  res.send("This Project is working..");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
