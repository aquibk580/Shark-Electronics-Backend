import mongoose, { Schema, model } from "mongoose";

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    category: {
      type: mongoose.ObjectId,
      ref: "category",
    },
    quantity: {
      type: Number,
      required: true,
      min:[0, "Product Sock cannot be less than 0"]
    },
    photo: {
      type: String,
    },
    shipping: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

const Product = model("Product", productSchema);

export default Product;
