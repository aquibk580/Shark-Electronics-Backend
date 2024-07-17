import Cart from "../models/cart.js";
import Product from "../models/product.js";
import mongoose from "mongoose";

export const addItemToCart = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, productId, quantity } = req.body;
    let cart = await Cart.findOne({ userId, status: "active" }).session(
      session
    );
    let product = await Product.findById(productId).session(session);

    if (!product) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    if (!cart) {
      cart = new Cart({ userId, items: [{ productId, quantity }] });
      await cart.save({ session });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (itemIndex > -1) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).send({
          success: false,
          message: "Product is already in the cart",
        });
      } else {
        cart.items.push({ productId, quantity });
        await cart.save({ session });
      }
    }

    product.quantity -= 1;
    await product.save({ session });

    await session.commitTransaction();
    session.endSession();

    cart = await Cart.findOne({ userId, status: "active" }).populate(
      "items.productId"
    );
    return res.status(200).send({
      success: true,
      message: "Product Added to cart successfully",
      cart,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Something went wrong while adding item to the cart",
      error,
    });
  }
};

export const getCart = async (req, res) => {
  try {
    const { uid } = req.params;
    const userId = uid;
    const cart = await Cart.findOne({ userId, status: "active" }).populate(
      "items.productId"
    );

    if (!cart) {
      return res.status(404).send({
        success: false,
        message: "Cart not Found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Cart item recieved",
      cart,
    });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Something went wrong", error });
  }
};

export const removeItemFromCart = async (req, res) => {
  try {
    const { userId, productId } = req.params;
    let cart = await Cart.findOne({ userId, status: "active" });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const item = cart.items.find(
      (item) => item.productId.toString() === productId
    );

    if (!item) {
      return res.status(404).send({
        success: false,
        message: "Product not found in the cart",
      });
    }

    const itemQuantity = item.quantity;

    // Remove the item from the cart
    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId
    );

    await cart.save();

    // Increase the product stock quantity
    await Product.findOneAndUpdate(
      { _id: productId },
      { $inc: { quantity: itemQuantity } }
    );
    cart = await Cart.findOne({ userId, status: "active" }).populate(
      "items.productId"
    );
    res.status(200).send({
      success: true,
      message: "Item removed from the cart successfully",
      cart,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while removing item",
    });
  }
};

export const increaseProductQty = async (req, res) => {
  const { userId, productId } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the active cart for the user
    let cart = await Cart.findOne({ userId, status: "active" })
      .populate("items.productId")
      .session(session);

    // If cart doesn't exist, return 404
    if (!cart) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).send({
        success: false,
        message: "Cart not found",
      });
    }

    // Check the stock quantity of the product
    const product = await Product.findById(productId).session(session);
    if (!product) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    if (product.quantity === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send({
        success: false,
        message: "Product is out of stock",
      });
    }

    // Find the product in the cart's items
    let productFound = false;
    for (let item of cart.items) {
      if (item.productId._id.toString() === productId) {
        item.quantity += 1; // Increase quantity in cart
        productFound = true;
        break;
      }
    }

    // If product not found in cart, return 404
    if (!productFound) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).send({
        success: false,
        message: "Product not found in cart",
      });
    }

    // Save updated cart
    await cart.save({ session });

    // Update product stock quantity in the database
    const productUpdate = await Product.findOneAndUpdate(
      { _id: productId },
      { $inc: { quantity: -1 } }, // Assuming quantity field is decremented by 1
      { new: true, session }
    );

    if (!productUpdate) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    // Update the product quantity in the cart
    for (let item of cart.items) {
      if (item.productId._id.toString() === productId) {
        item.productId.quantity = productUpdate.quantity;
        break;
      }
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Respond with success message and updated cart
    res.status(200).send({
      success: true,
      message: "Product quantity increased",
      cart,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};

export const decreaseProductQty = async (req, res) => {
  try {
    const { userId, productId } = req.body;

    // Find the active cart for the user and populate the product details
    let cart = await Cart.findOne({ userId, status: "active" }).populate(
      "items.productId"
    );

    // If cart doesn't exist, return 404
    if (!cart) {
      return res.status(404).send({
        success: false,
        message: "Cart not found",
      });
    }

    // Find the product in the cart's items
    let productFound = false;
    for (let item of cart.items) {
      if (item.productId._id.toString() === productId) {
        // Check if quantity is already 0
        if (item.quantity <= 1) {
          return res.status(400).send({
            success: false,
            message: "Product quantity cannot be less than 1",
          });
        }

        item.quantity -= 1; // Decrease quantity in cart

        // Increase the product stock quantity
        await Product.findOneAndUpdate(
          { _id: productId },
          { $inc: { quantity: 1 } }
        );

        productFound = true;
        break;
      }
    }

    // If product not found in cart, return 404
    if (!productFound) {
      return res.status(404).send({
        success: false,
        message: "Product not found in cart",
      });
    }

    // Save updated cart
    await cart.save();

    // Respond with success message and updated cart
    res.status(200).send({
      success: true,
      message: "Product quantity decreased",
      cart,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};

export const removeAllItemsFromCart = async (req, res) => {
  try {
    const { userId } = req.params;
    const cart = await Cart.findOne({ userId }); // Find the cart by userId
    if (!cart) {
      return res.status(404).send({
        success: false,
        message: "Cart not found",
      });
    }
    cart.items = [];
    await cart.save(); // Save the changes to the database
    res.status(200).send({
      success: true,
      message: "All Cart Items Removed Successfully",
      cart,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error While Removing All Items From Cart",
      error: error.message,
    });
  }
};
