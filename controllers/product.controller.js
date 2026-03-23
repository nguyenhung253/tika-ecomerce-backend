"use strict";

const { SuccessResponse, CREATED } = require("../helpers/success.response");
const { ProductFactory } = require("../services/product.service");
const asyncHandler = require("../helpers/asyncHandler");

class ProductController {
  /**
   * Create new product
   */
  static createProduct = asyncHandler(async (req, res, next) => {
    return new CREATED({
      message: "Create new Product success",
      data: await ProductFactory.createProduct(req.body.product_type, {
        ...req.body,
        product_shop: req.user.id,
      }),
    }).send(res);
  });

  /**
   * Update product
   */
  static updateProduct = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Update Product success",
      data: await ProductFactory.updateProduct(
        req.body.product_type,
        req.params.productId,
        {
          ...req.body,
          product_shop: req.user.id,
        },
      ),
    }).send(res);
  });

  /**
   * Publish product (draft -> published)
   */
  static publishProductByShop = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Publish Product success",
      data: await ProductFactory.publishProductByShop({
        product_shop: req.user.id,
        product_id: req.params.id,
      }),
    }).send(res);
  });

  /**
   * Unpublish product (published -> draft)
   */
  static unPublishProductByShop = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Unpublish Product success",
      data: await ProductFactory.unPublishProductByShop({
        product_shop: req.user.id,
        product_id: req.params.id,
      }),
    }).send(res);
  });

  // QUERY //

  /**
   * Get all draft products for shop
   */
  static getAllDraftForShop = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Get list Draft success",
      data: await ProductFactory.findAllDraftForShop({
        product_shop: req.user.id,
      }),
    }).send(res);
  });

  /**
   * Get all published products for shop
   */
  static getAllPublishedForShop = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Get list Published success",
      data: await ProductFactory.findAllPublishedForShop({
        product_shop: req.user.id,
      }),
    }).send(res);
  });

  /**
   * Search products by keyword
   */
  static getListSearchProduct = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Search Product success",
      data: await ProductFactory.searchProducts(req.params),
    }).send(res);
  });

  /**
   * Get all products (for users)
   */
  static findAllProducts = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Get list Products success",
      data: await ProductFactory.findAllProducts(req.query),
    }).send(res);
  });

  /**
   * Get product detail
   */
  static findProduct = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Get Product detail success",
      data: await ProductFactory.findProduct({
        product_id: req.params.product_id,
      }),
    }).send(res);
  });

  // END QUERY //
}

module.exports = ProductController;
