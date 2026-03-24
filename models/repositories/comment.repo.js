"use strict";

const Comment = require("../comment.model");

const getCommentsByProductId = async ({
  productId,
  filter = {},
  sortBy,
  skip,
  limit,
}) => {
  const query = {
    comment_productId: productId,
    ...filter,
  };

  const [items, totalItems] = await Promise.all([
    Comment.find(query).sort(sortBy).skip(skip).limit(limit).lean(),
    Comment.countDocuments(query),
  ]);

  return {
    items,
    totalItems,
  };
};

const findByCommentId = async (commentId) => {
  const comment = await Comment.findById(commentId);
  return comment;
};

const findAllComments = async ({ filter = {}, sortBy, skip, limit }) => {
  const [items, totalItems] = await Promise.all([
    Comment.find(filter).sort(sortBy).skip(skip).limit(limit).lean(),
    Comment.countDocuments(filter),
  ]);

  return {
    items,
    totalItems,
  };
};

module.exports = {
  getCommentsByProductId,
  findAllComments,
  findByCommentId,
};
