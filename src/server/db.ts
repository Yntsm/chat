import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

export const connectDB = async () => {
  if (!MONGODB_URI) {
    console.warn("MONGODB_URI environment variable is missing. MongoDB connection skipped.");
    return false;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB Connected");
    return true;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    return false;
  }
};
