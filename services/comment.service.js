"use strict";

const Comment = require("../models/comment.model");
const {
  getCommentsByProductId,
  findByCommentId,
} = require("../models/repositories/comment.repo");
/*
   + get comments by productId [user,shop],
   + create comment [user,shop],
   + get all comments [admin],
   + update comment  [user, shop],
   + delete comment [user,shop,admin],

*/

class CommentService {
  static async createComment({ productId, userId, content, rating = 0 }) {
    const comment = await Comment.create({
      comment_productId: productId,
      comment_userId: userId,
      comment_content: content,
      comment_rating: rating,
    });
    return comment;
  }

  static async getCommentsByProductId(productId) {
    const comments = await Comment.getCommentsByProductId(productId);
    if (!comments) throw new BadRequestError("Not found");
    return comments;
  }

  static async getAllComments() {
    const comments = await Comment.findAllComments();
    if (!comments) throw new BadRequestError("Not found");
    return comments;
  }

  static async deleteComment(commentId, userId) {
    const comment = await Comment.findByCommentId(commentId);
    if (!comment) throw new BadRequestError("Not found");
    if (comment.comment_userId !== userId)
      throw new BadRequestError("Unauthorized");
    await comment.remove();
    return comment;
  }

  static async updateComment(commentId, userId, { content, rating }) {
    const comment = await Comment.findByCommentId(commentId);
    if (!comment) throw new BadRequestError("Not found");
    if (comment.comment_userId !== userId)
      throw new BadRequestError("Unauthorized");
    comment.comment_content = content;
    comment.comment_rating = rating;
    await comment.save();
    return comment;
  }
}

module.exports = CommentService;
