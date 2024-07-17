import { Router } from "express";
import { requireSignIn, isAdmin } from "../middlewares/authMiddleware.js";
import {
  createCategoryController,
  updateCategoryController,
  allCategoryController,
  singleCategoryController,
  deleteCategoryController,
} from "../controllers/category.js";

const router = Router();

// create category
router.post(
  "/create-category",
  requireSignIn,
  isAdmin,
  createCategoryController
);

// upate category
router.put(
  "/update-category/:id",
  requireSignIn,
  isAdmin,
  updateCategoryController
);

// getAll Category

router.get("/get-category", allCategoryController);

// Single Category

router.get("/get-category/:slug", singleCategoryController);

// delete Category

router.delete(
  "/delete-category/:id",
  requireSignIn,
  isAdmin,
  deleteCategoryController
);

export default router;
