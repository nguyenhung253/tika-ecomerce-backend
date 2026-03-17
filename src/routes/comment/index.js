"use strict";

const express = require("express");
const CommentController = require("../../controllers/comment.controller");
const asyncHandler = require("../../helpers/asyncHandler");
const { authentication, requireRole } = require("../../auth/authentication");
const router = express.Router();

router.get("", asyncHandler(CommentController.getAllCommentsAllComments));
router.get(
  "/:productId",
  asyncHandler(CommentController.getCommentsByProductIdCommentByProductId),
);

// Protected routes - require authentication
router.use(authentication);

// User only routes
router.post(
  "",
  requireRole("user"),

  asyncHandler(CommentController.createComment),
);

router.patch(
  "/:commentId",
  requireRole("user"),
  asyncHandler(CommentController.updateComment),
);

router.delete(
  "/:commentId",
  requireRole("user"),
  asyncHandler(CommentController.deleteComment),
);

module.exports = router;
