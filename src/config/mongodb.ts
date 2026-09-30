import "dotenv/config";
import { MongoClient } from "mongodb";

const { MONGO_URI, DB_USERNAME, DB_PASSWORD } = process.env;

if (!MONGO_URI || !DB_USERNAME || !DB_PASSWORD) {
  throw new Error(
    "MONGO_URI, DB_USERNAME or DB_PASSWORD is not defined",
  );
}

export const client = new MongoClient(MONGO_URI, {
  auth: {
    username: DB_USERNAME,
    password: DB_PASSWORD,
  },
});

export const connectMongoDB = async () => {
  await client.connect();

  return client;
};
