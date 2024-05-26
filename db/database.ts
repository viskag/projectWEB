import {Collection, MongoClient, ObjectId, ServerApiVersion} from "mongodb";
import { Car, User } from "../interface";
import dotenv from "dotenv";
dotenv.config();
const uri : string = process.env.URI ?? "mongodb://localhost:27017";
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
async function exit() {
  try {
      await client.close();
      console.log("Disconnected from database");
  } catch (error) {
      console.error(error);
  }
  process.exit(0);
}
// Maakt connectie aan met database
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
export const userCollection: Collection<User> = client.db("Website").collection<User>("Users");
export async function seed(){
    if (await carCollection.countDocuments() === 0) {
        await carCollection.insertMany(data);
        console.log("seeding DB");
    }
}
export async function getCars() {
  return await carCollection.find().toArray();
}
export async function getUsers() {
  return await userCollection.find().toArray();
}
import bcrypt from 'bcryptjs';
export async function findUserByUsername(username: string): Promise<User | null> {
  return await userCollection.findOne({ username: username });
}
export async function addUser(user: User): Promise<void> {
  user.password = await bcrypt.hash(user.password, 10); // Hash the password before saving
  await userCollection.insertOne(user);
}
export async function verifyUser(username: string, password: string): Promise<boolean> {
  const user = await findUserByUsername(username);
  if (user && await bcrypt.compare(password, user.password)) {
    return true;
  }
  return false;
}
//run().catch(console.dir);//Code van mongoDB atlas maar niet op deze wijze, cursus gevolgd