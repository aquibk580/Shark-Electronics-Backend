import { Router } from "express";
import {
  registerController,
  loginController,
  testController,
  forgotPasswordController,
  updateProfileController,
  getAllUsersController,
} from "../controllers/auth.js";
import { isAdmin, requireSignIn } from "../middlewares/authMiddleware.js";

const router = Router();

// Register
router.post("/register", registerController);

router.post("/login", loginController);

router.post("/forgot-password", forgotPasswordController);

router.get("/test", requireSignIn, isAdmin, testController);

router.get("/user-auth", requireSignIn, (req, res) => {
  res.status(200).send({
    success: true,
    ok: true,
  });
});
router.get("/admin-auth", requireSignIn, isAdmin, (req, res) => {
  res.status(200).send({
    success: true,
    ok: true,
  });
});

// update profile
router.put("/profile", requireSignIn, updateProfileController);

router.get("/admin-getallusers", requireSignIn, isAdmin, getAllUsersController);

export default router;
