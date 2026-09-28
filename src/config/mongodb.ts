import "dotenv/config";
import { MongoClient } from "mongodb";

const { MONGO_URI, DB_USERNAME, DB_PASSWORD } = process.env;

const uri = process.env.MONGO_URI;

if (!uri || !DB_USERNAME || !DB_PASSWORD) {
  throw new Error(
    "MONGO_URI, DB_USERNAME or DB_PASSWORD is not defined",
  );
}

const client = new MongoClient(uri, {
  auth: {
    username: DB_USERNAME,
    password: DB_PASSWORD,
  },
});

export const connectMongoDB = async () => {
  await client.connect();

  return client;
};
