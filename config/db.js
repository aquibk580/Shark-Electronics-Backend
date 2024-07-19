import mongoose from "mongoose";
import colors from "colors";
import dotenv from "dotenv";
dotenv.config();

const URI = process.env.MONGOURI;

const connectToMongo = async () => {
  try {
    const connection = await mongoose.connect(URI);
    console.log(
      `Connected to MongoDB Successfully: ${connection.connection.host}`
        .bgMagenta.white
    );
  } catch (error) {
    console.log(`Error in MongoDB Connection: ${error.message}`.bgRed.white);
  }
};

export default connectToMongo;
