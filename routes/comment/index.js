"use strict";

const express = require("express");
const CommentController = require("../../controllers/comment.controller");
const asyncHandler = require("../../helpers/asyncHandler");
const { authentication, requireRole } = require("../../auth/authentication");
const router = express.Router();

router.get("", asyncHandler(CommentController.getAllComments));
router.get(
  "/:productId",
  asyncHandler(CommentController.getCommentsByProductId),
);

// Protected routes - require authentication
router.use(authentication);

// User only routes
router.post(
  "",
  requireRole("customer", "admin"),

  asyncHandler(CommentController.createComment),
);

router.patch(
  "/:commentId",
  requireRole("customer", "admin"),
  asyncHandler(CommentController.updateComment),
);

router.delete(
  "/:commentId",
  requireRole("customer", "admin"),
  asyncHandler(CommentController.deleteComment),
);

module.exports = router;
