import Router from "express";
import { requireSignIn } from "../middlewares/authMiddleware.js";
import {
  addItemToCart,
  decreaseProductQty,
  getCart,
  increaseProductQty,
  removeItemFromCart,
  removeAllItemsFromCart,
} from "../controllers/cart.js";

const router = Router();

// Add to cart
router.post("/add-cartitem", requireSignIn, addItemToCart);

// get items from cart
router.get("/get-cart/:uid", requireSignIn, getCart);

// remove item from cart
router.delete(
  "/delete-cartitem/:userId/:productId",
  requireSignIn,
  removeItemFromCart
);

// increase product quantity
router.post("/increase-quantity", requireSignIn, increaseProductQty);

// decrease product quantity
router.post("/decrease-quantity", requireSignIn, decreaseProductQty);

//remove all items from cart
router.delete(
  "/remove-allitems/:userId",
  requireSignIn,
  removeAllItemsFromCart
);

export default router;
