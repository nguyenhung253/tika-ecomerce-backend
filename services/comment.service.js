"use strict";

const Comment = require("../models/comment.model");
const {
  getCommentsByProductId,
  findByCommentId,
  findAllComments,
} = require("../models/repositories/comment.repo");
const { BadRequestError } = require("../helpers/error.response");
/*
   + get comments by productId [user,shop],
   + create comment [user,shop],
   + get all comments [admin],
   + update comment  [user, shop],
   + delete comment [user,shop,admin],

*/

class CommentService {
  static buildPaginationInput(query = {}, defaultLimit = 20, maxLimit = 100) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const rawLimit = parseInt(query.limit, 10) || defaultLimit;
    const limit = Math.min(Math.max(rawLimit, 1), maxLimit);
    return { page, limit };
  }

  static buildSortInput(query = {}, defaultSortBy = "createdAt") {
    const allowedSortFields = ["createdAt", "updatedAt", "comment_rating"];
    const sortByField = allowedSortFields.includes(query.sortBy)
      ? query.sortBy
      : defaultSortBy;
    const order =
      String(query.order || "desc").toLowerCase() === "asc" ? 1 : -1;
    return {
      sortByField,
      order,
      sortBy: {
        [sortByField]: order,
      },
    };
  }

  static buildPaginationMeta({ page, limit, totalItems }) {
    const totalPages = Math.max(Math.ceil(totalItems / limit), 1);
    return {
      totalItems,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  static buildCommentFilter(query = {}) {
    const filter = {
      isDeleted: false,
    };

    if (query.userId) {
      filter.comment_userId = query.userId;
    }

    const minRating = Number(query.minRating);
    const maxRating = Number(query.maxRating);
    if (!Number.isNaN(minRating) || !Number.isNaN(maxRating)) {
      filter.comment_rating = {};
      if (!Number.isNaN(minRating)) filter.comment_rating.$gte = minRating;
      if (!Number.isNaN(maxRating)) filter.comment_rating.$lte = maxRating;
    }

    if (query.search) {
      filter.comment_content = {
        $regex: String(query.search).trim(),
        $options: "i",
      };
    }

    return filter;
  }

  static async createComment({ productId, userId, content, rating = 0 }) {
    const comment = await Comment.create({
      comment_productId: productId,
      comment_userId: String(userId),
      comment_content: content,
      comment_rating: rating,
    });
    return comment;
  }

  static async getCommentsByProductId({ productId, query = {} }) {
    const { page, limit } = CommentService.buildPaginationInput(query, 20, 100);
    const { sortByField, order, sortBy } = CommentService.buildSortInput(
      query,
      "createdAt",
    );
    const filter = CommentService.buildCommentFilter(query);
    const skip = (page - 1) * limit;

    const comments = await getCommentsByProductId({
      productId,
      filter,
      sortBy,
      skip,
      limit,
    });

    return {
      items: comments.items,
      pagination: CommentService.buildPaginationMeta({
        page,
        limit,
        totalItems: comments.totalItems,
      }),
      sort: {
        sortBy: sortByField,
        order: order === 1 ? "asc" : "desc",
      },
      filters: {
        search: query.search || "",
        userId: query.userId || "",
        minRating:
          query.minRating !== undefined
            ? Number(query.minRating) || 0
            : undefined,
        maxRating:
          query.maxRating !== undefined
            ? Number(query.maxRating) || 0
            : undefined,
      },
    };
  }

  static async getAllComments(query = {}) {
    const { page, limit } = CommentService.buildPaginationInput(query, 20, 100);
    const { sortByField, order, sortBy } = CommentService.buildSortInput(
      query,
      "createdAt",
    );
    const filter = CommentService.buildCommentFilter(query);

    if (query.productId) {
      filter.comment_productId = query.productId;
    }

    const skip = (page - 1) * limit;
    const comments = await findAllComments({
      filter,
      sortBy,
      skip,
      limit,
    });

    return {
      items: comments.items,
      pagination: CommentService.buildPaginationMeta({
        page,
        limit,
        totalItems: comments.totalItems,
      }),
      sort: {
        sortBy: sortByField,
        order: order === 1 ? "asc" : "desc",
      },
      filters: {
        search: query.search || "",
        productId: query.productId || "",
        userId: query.userId || "",
        minRating:
          query.minRating !== undefined
            ? Number(query.minRating) || 0
            : undefined,
        maxRating:
          query.maxRating !== undefined
            ? Number(query.maxRating) || 0
            : undefined,
      },
    };
  }

  static async deleteComment(commentId, userId) {
    const comment = await findByCommentId(commentId);
    if (!comment || comment.isDeleted) throw new BadRequestError("Not found");
    if (String(comment.comment_userId) !== String(userId))
      throw new BadRequestError("Unauthorized");

    comment.isDeleted = true;
    await comment.save();
    return comment;
  }

  static async updateComment(commentId, userId, { content, rating }) {
    const comment = await findByCommentId(commentId);
    if (!comment || comment.isDeleted) throw new BadRequestError("Not found");
    if (String(comment.comment_userId) !== String(userId))
      throw new BadRequestError("Unauthorized");

    if (content !== undefined) {
      comment.comment_content = content;
    }

    if (rating !== undefined) {
      comment.comment_rating = rating;
    }

    await comment.save();
    return comment;
  }
}

module.exports = CommentService;
