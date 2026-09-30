import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin, bearer } from "better-auth/plugins";
import { connectMongoDB } from "./mongodb";
import { client } from "./mongodb"; 

const db = client.db(process.env.MONGODB_DB);

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client,
  }),

  user: {
    additionalFields: {
      phone: {
        type: "string",
        required: false,
      },
      imagePublicId: {
        type: "string",
        required: false,
      },
    },
  },

  plugins: [admin(), bearer()],

  session: {
    expiresIn: 60 * 60 * 24,
    updateAge: 0,
    disableSessionRefresh: true,
  },
});
