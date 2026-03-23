"use strict";

const express = require("express");
const ProductController = require("../../controllers/product.controller");
const asyncHandler = require("../../helpers/asyncHandler");
const { authentication, requireRole } = require("../../auth/authentication");
const router = express.Router();

// Public routes - không cần authentication
router.get(
  "/search/:keySearch",
  asyncHandler(ProductController.getListSearchProduct),
);
router.get("", asyncHandler(ProductController.findAllProducts));
router.get("/:product_id", asyncHandler(ProductController.findProduct));

// Protected routes - require authentication
router.use(authentication);

// Shop only routes
router.post(
  "",
  requireRole("shop"),
  asyncHandler(ProductController.createProduct),
);

router.patch(
  "/:productId",
  requireRole("shop"),
  asyncHandler(ProductController.updateProduct),
);

router.post(
  "/publish/:id",
  requireRole("shop"),
  asyncHandler(ProductController.publishProductByShop),
);

router.post(
  "/unpublish/:id",
  requireRole("shop"),
  asyncHandler(ProductController.unPublishProductByShop),
);

// Get draft products
router.get(
  "/drafts/all",
  requireRole("shop"),
  asyncHandler(ProductController.getAllDraftForShop),
);

// Get published products
router.get(
  "/published/all",
  requireRole("shop"),
  asyncHandler(ProductController.getAllPublishedForShop),
);

module.exports = router;
