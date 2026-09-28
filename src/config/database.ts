import mongoose from "mongoose";
import config from ".";

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  await mongoose.connect(config.mongoURI, {
    ...config.databaseConfig,
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  isConnected = true;

  console.log("Database connected!");
};

export default connectDB;