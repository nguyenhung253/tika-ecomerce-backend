"use strict";

const { Comment } = require("../models");

const getCommentsByProductId = async (productId) => {
  const comments = await Comment.find({ comment_productId: productId });
  return comments;
};

const findByCommentId = async (commentId) => {
  const comment = await Comment.findById(commentId);
  return comment;
};

const findAllComments = async ({ limit, sort, page, filter, select }) => {
  const skip = (page - 1) * limit;
  const sortBy = sort === "ctime" ? { _id: -1 } : { _id: 1 };
  const comments = await comment
    .find(filter)
    .sort(sortBy)
    .skip(skip)
    .limit(limit)
    .select(getSelectData(select))
    .lean();

  return comments;
};

module.exports = {
  getCommentsByProductId,
  findAllComments,
  findByCommentId,
};
