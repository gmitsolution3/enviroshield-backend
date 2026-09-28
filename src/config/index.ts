import "dotenv/config";

export default {
  port: process.env.PORT || 9000,
  mongoURI: process.env.MONGO_URI as string,
  databaseConfig: {
    user: process.env.DB_USERNAME,
    pass: process.env.DB_PASSWORD,
  },
};