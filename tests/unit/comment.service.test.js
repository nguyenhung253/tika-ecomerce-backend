"use strict";

jest.mock("../../models/comment.model", () => ({
  create: jest.fn(),
}));

jest.mock("../../models/repositories/comment.repo", () => ({
  getCommentsByProductId: jest.fn(),
  findByCommentId: jest.fn(),
  findAllComments: jest.fn(),
}));

const Comment = require("../../models/comment.model");
const {
  findByCommentId,
} = require("../../models/repositories/comment.repo");
const CommentService = require("../../services/comment.service");

describe("CommentService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stringifies user id when creating a comment", async () => {
    Comment.create.mockResolvedValueOnce({
      _id: "comment-1",
      comment_userId: "123",
    });

    await CommentService.createComment({
      productId: "product-1",
      userId: 123,
      content: "Nice product",
      rating: 5,
    });

    expect(Comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        comment_productId: "product-1",
        comment_userId: "123",
        comment_content: "Nice product",
        comment_rating: 5,
      }),
    );
  });

  it("updates only owned comments", async () => {
    const save = jest.fn();
    findByCommentId.mockResolvedValueOnce({
      _id: "comment-1",
      comment_userId: "user-1",
      comment_content: "old",
      comment_rating: 3,
      isDeleted: false,
      save,
    });

    const result = await CommentService.updateComment("comment-1", "user-1", {
      content: "updated",
      rating: 4,
    });

    expect(result.comment_content).toBe("updated");
    expect(result.comment_rating).toBe(4);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("soft deletes only owned comments", async () => {
    const save = jest.fn();
    const foundComment = {
      _id: "comment-1",
      comment_userId: "user-1",
      isDeleted: false,
      save,
    };
    findByCommentId.mockResolvedValueOnce(foundComment);

    const result = await CommentService.deleteComment("comment-1", "user-1");

    expect(result.isDeleted).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
