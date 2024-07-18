import productModel from "../models/product.js";
import mongoose from "mongoose";
import categoryModel from "../models/category.js";
import axios from "axios";
import slugify from "slugify";
import { getDirname } from "../helpers/dirName.js";
import dotenv from "dotenv";
import Order from "../models/order.js";
import braintree from "braintree";
import cloudinary from '../config/cloudinary.js';
const { ObjectId } = mongoose.Types;

dotenv.config();

var gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

const __dirname = getDirname(import.meta.url);

export const createProductController = async (req, res) => {
  try {
    const { name, description, price, category, quantity } = req.fields;
    const { photo } = req.files;

    switch (true) {
      case !name:
        return res.status(500).send({ error: "Name is Required" });
      case !description:
        return res.status(500).send({ error: "Description is Required" });
      case !price:
        return res.status(500).send({ error: "Price is Required" });
      case !category:
        return res.status(500).send({ error: "Category is Required" });
      case !quantity:
        return res.status(500).send({ error: "Quantity is Required" });
      case photo && photo.size > 1000000:
        return res.status(500).send({ error: "Photo should be less than 1MB" });
    }

    const product = new productModel({ ...req.fields, slug: slugify(name) });

    if (photo) {
      const result = await cloudinary.uploader.upload(photo.path, {
        folder: "products",
        use_filename: true,
        unique_filename: true,
      });
      product.photo = result.secure_url;
    }

    await product.save();
    res.status(201).send({
      success: true,
      message: "Product Created Successfully",
      product,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      error,
      message: "Error in creating product",
    });
  }
};

//get all products
export const getProductController = async (req, res) => {
  try {
    const products = await productModel
      .find({})
      .populate("category")
      .select("-photo")
      .limit(12)
      .sort({ createdAt: -1 });
    res.status(200).send({
      success: true,
      counTotal: products.length,
      message: "ALlProducts ",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Erorr in getting products",
      error: error.message,
    });
  }
};
// get single product
export const getSingleProductController = async (req, res) => {
  try {
    const product = await productModel
      .findOne({ slug: req.params.slug })
      .select("-photo")
      .populate("category");

    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Single Product Fetched",
      product,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Eror while getitng single product",
      error,
    });
  }
};

// get photo

export const productPhotoController = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.pid).select("photo");

    if (product && product.photo) {
      const response = await axios.get(product.photo, { responseType: 'arraybuffer' });

      const contentType = response.headers['content-type'];

      res.set('Content-Type', contentType);
      res.status(200).send(response.data);
    } else {
      return res.status(404).send({
        success: false,
        message: "Photo not found",
      });
    }
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error while getting photo",
      error,
    });
  }
};


//delete controller

export const deleteProductController = async (req, res) => {
  try {
    // Find the product by ID
    const product = await productModel.findById(req.params.pid);
    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    // Get the image URL from the product
    const imageUrl = product.photo;

    // Delete the product from the database
    await productModel.findByIdAndDelete(req.params.pid);

    // Delete the image from Cloudinary
    if (imageUrl) {
      // Extract public ID from the Cloudinary URL
      const publicIdMatch = imageUrl.match(/\/v\d+\/(.+)\.[a-z]+$/);
      if (publicIdMatch) {
        const publicId = publicIdMatch[1];
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }, (error, result) => {
          if (error) {
            console.error("Error deleting the image from Cloudinary:", error);
          } else {
            console.log("Cloudinary delete result:", result);
          }
        });
      } else {
        console.error("Failed to extract public ID from the image URL");
      }
    }

    res.status(200).send({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while deleting product",
      error,
    });
  }
};


//upate product
export const updateProductController = async (req, res) => {
  try {
    if (!req.fields) {
      return res.status(400).send({ error: "Form fields are missing" });
    }
    const { name, description, price, category, quantity } = req.fields;
    const { photo } = req.files;

    switch (true) {
      case !name:
        return res.status(400).send({ error: "Name is Required" });
      case !description:
        return res.status(400).send({ error: "Description is Required" });
      case !price:
        return res.status(400).send({ error: "Price is Required" });
      case !category:
        return res.status(400).send({ error: "Category is Required" });
      case !quantity:
        return res.status(400).send({ error: "Quantity is Required" });
      case photo && photo.size > 1000000:
        return res.status(400).send({ error: "Photo should be less than 1MB" });
    }

    // Validate ObjectId
    if (!ObjectId.isValid(req.params.pid)) {
      return res.status(400).send({ error: "Invalid product ID" });
    }

    // Fetch the current product to get the old photo path
    const currentProduct = await productModel.findById(req.params.pid);

    if (!currentProduct) {
      return res.status(404).send({ error: "Product not found" });
    }
    const oldPhotoUrl = currentProduct.photo;

    const product = await productModel.findByIdAndUpdate(
      req.params.pid,
      { ...req.fields, slug: slugify(name) },
      { new: true }
    );

    if (photo) {
      // Upload new photo to Cloudinary
      const result = await cloudinary.uploader.upload(photo.path, {
        folder: "products",
        use_filename: true,
        unique_filename: false,
      });
      product.photo = result.secure_url;

      // Delete the old photo from Cloudinary if it exists
      if (oldPhotoUrl) {
        // Extract public ID from the Cloudinary URL
        const publicIdMatch = oldPhotoUrl.match(/\/v\d+\/(.+)\.[a-z]+$/);
        if (publicIdMatch) {
          const publicId = publicIdMatch[1];
          await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }, (error, result) => {
            if (error) {
              console.error("Error deleting the image from Cloudinary:", error);
            } else {
              console.log("Cloudinary delete result:", result);
            }
          });
        }
      }
    }

    await product.save();
    res.status(200).send({
      success: true,
      message: "Product Updated Successfully",
      product,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error While updating product",
    });
  }
};

// product filter contoller

export const productFiltersController = async (req, res) => {
  try {
    const { checked, radio } = req.body;
    let args = {};
    if (checked.length > 0) args.category = checked;
    if (radio.length) args.price = { $gte: radio[0], $lte: radio[1] };
    const products = await productModel.find(args);
    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error While Filtering Product",
      error,
    });
  }
};

export const productCountController = async (req, res) => {
  try {
    const total = await productModel.find({}).estimatedDocumentCount();
    res.status(200).send({
      success: true,
      total,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      message: "Error in product count",
      error,
      success: false,
    });
  }
};

// product list base on page
export const productListController = async (req, res) => {
  try {
    const perPage = 6;
    let page = parseInt(req.params.page) || 1;

    const totalProducts = await productModel.countDocuments({});
    const totalPages = Math.ceil(totalProducts / perPage);

    if (page > totalPages) {
      page = 1;
    }

    const products = await productModel
      .find({})
      .select("-photo")
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 });

    res.status(200).send({
      success: true,
      products,
      page,
      totalPages,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "error in per page ctrl",
      error,
    });
  }
};


// search product
export const searchProductController = async (req, res) => {
  try {
    const { keyword } = req.params;
    const results = await productModel
      .find({
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
        ],
      })
      .select("-photo");
    res.json(results);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error While Searching Products",
      error,
    });
  }
};

export const relatedProductController = async (req, res) => {
  try {
    const { pid, cid } = req.params;
    const products = await productModel
      .find({
        category: cid,
        _id: { $ne: pid },
      })
      .select("-photo")
      .limit(3)
      .populate("category");
    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while getting Related Products",
      error,
    });
  }
};

export const productCategoryController = async (req, res) => {
  try {
    const category = await categoryModel.findOne({ slug: req.params.slug });
    const products = await productModel.find({ category }).populate("category");
    res.status(200).send({
      success: true,
      category,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while getting Category wise Products",
      error,
    });
  }
};

//payment gateway api
//token
export const braintreeTokenController = async (req, res) => {
  try {
    gateway.clientToken.generate({}, function (err, response) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.send(response);
      }
    });
  } catch (error) {
    console.log(error);
  }
};

//payment
export const brainTreePaymentController = async (req, res) => {
  try {
    const { cart, nonce } = req.body;
    let total = 0;

    // Calculate the total amount from the cart items
    cart.items.forEach((item) => {
      total += item.productId.price * item.quantity;
    });

    // Create a new transaction
    gateway.transaction.sale(
      {
        amount: total,
        paymentMethodNonce: nonce,
        options: {
          submitForSettlement: true,
        },
      },
      async (error, result) => {
        if (result) {
          // Save the order if the transaction is successful
          let cartItems = cart.items.map((item) => {
            return item.productId;
          });
          const order = await new Order({
            products: cartItems,
            payment: result,
            buyer: req.user._id,
          }).save();

          // Respond to the client
          res.json({ ok: true, order });
        } else {
          // Respond with the error if the transaction failed
          res.status(500).send(error);
        }
      }
    );
  } catch (error) {
    // Handle unexpected errors
    res.status(500).send({
      success: false,
      message: "Error While Processing Payment",
      error,
    });
  }
};
