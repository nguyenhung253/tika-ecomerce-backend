"use strict";

const CommentService = require("../services/comment.service");
const { SuccessResponse } = require("../helpers/success.response");
const asyncHandler = require("../helpers/asyncHandler");

class CommentController {
  static createComment = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Create Comment success",
      data: await CommentService.createComment(req.body),
    }).send(res);
  });

  static getCommentsByProductId = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Get Comments By Product Id success",
      data: await CommentService.getCommentsByProductId(req.params.productId),
    }).send(res);
  });

  static updateComment = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Update Comment success",
      data: await CommentService.updateComment(req.params.commentId, req.body),
    }).send(res);
  });

  static deleteComment = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Delete Comment success",
      data: await CommentService.deleteComment(req.params.commentId),
    }).send(res);
  });

  static getAllComments = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Get All Comments success",
      data: await CommentService.getAllComments(),
    }).send(res);
  });
}

module.exports = CommentController;
