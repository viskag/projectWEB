import {Collection, MongoClient, ObjectId, ServerApiVersion} from "mongodb";
import { Car } from "../interface";
import dotenv from "dotenv";
dotenv.config();
//const { MongoClient, ServerApiVersion } = require('mongodb');
//const uri = "mongodb+srv://admin:adminpass@cluster0.kfmzbgp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const uri : string = process.env.URI ?? "mongodb://localhost:27017";
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
// export async function run() {
//     try {
  
//       // Connect the client to the server	(optional starting in v4.7)
//       await client.connect();
  
//       // Send a ping to confirm a successful connection
//       await client.db("admin").command({ ping: 1 });
//       console.log("Pinged your deployment. You successfully connected to MongoDB!");
//     } finally {
  
//       // Ensures that the client will close when you finish/error
//       await client.close();
//     }
// }
async function exit() {
  try {
      await client.close();
      console.log("Disconnected from database");
  } catch (error) {
      console.error(error);
  }
  process.exit(0);
}
export async function connect() {
  try {
      await client.connect();
      console.log("Connected to database");
      process.on("SIGINT", exit);
  } catch (error) {
      console.error(error);
  }
}
// Alle code omtrent Database (vullen, checken, etc)
const jsonData = require("../data.json");
const data : Car[] = jsonData;
export const carCollection: Collection<Car> = client.db("Website").collection<Car>("Cars");
export async function seed(){
    if (await carCollection.countDocuments() === 0) {
        await carCollection.insertMany(data);
        console.log("seeding DB");
    }
}
export async function getCars() {
  return await carCollection.find().toArray();
}
//run().catch(console.dir);