/**
 * 
ProductFactory (Static methods - Entry point)
    ↓
Product (Base class - Chứa logic chung)
    ↓
├── Electronic (Extends Product)
└── Clothing (Extends Product)
**/

"use strict";
const { BadRequestError } = require("../helpers/error.response");
const { clothing, product, electronic } = require("../models/product.model");
const { insertInventory } = require("../models/repositories/inventory.repo");
const { findAllDraftShop } = require("../models/repositories/product.repo");
class ProductFactory {
  static async createProduct(type, payload) {
    switch (type) {
      case "Electronics":
        return new Electronic(payload).createProduct();
      case "Clothing":
        return new Clothing(payload).createProduct();
      default:
        throw new BadRequestError(`Invalid Product Types ${type}`);
    }
  }

  static async findAllDraftForShop({ product_shop, limit = 50, skip = 0 }) {
    const query = [product_shop, (isDraft = true)];
    return await findAllDraftShop({ query, limit, skip });
  }

  async createProduct(product_id) {
    const newProduct = await product.create({ ...this, _id: product_id });
    if (newProduct) {
      await insertInventory({
        productId: newProduct._id,
        shopId: this.product_shop,
        stock: this.product,
      });
    }
    return newProduct;
  }

  /**
   * Entry point cho update product
   * Step 1: Nhận request từ controller
   * Step 2: Route đến class con tương ứng dựa vào type
   * @param {string} type - Loại sản phẩm (Electronics/Clothing)
   * @param {string} productId - ID của product cần update
   * @param {object} payload - Data mới cần update
   */
  static async updateProduct(type, productId, payload) {
    switch (type) {
      case "Electronics":
        // Tạo instance Electronic với data mới, sau đó gọi updateProduct()
        return new Electronic(payload).updateProduct({ productId });
      case "Clothing":
        // Tạo instance Clothing với data mới, sau đó gọi updateProduct()
        return new Clothing(payload).updateProduct({ productId });
      default:
        throw new BadRequestError(`Invalid Product Types ${type}`);
    }
  }
}

class Product {
  constructor({
    product_name,
    product_thump,
    product_description,
    product_price,
    product_type,
    product_shop,
    product_attribute,
    product_quantity,
  }) {
    this.product_name = product_name;
    this.product_thump = product_thump;
    this.product_description = product_description;
    this.product_price = product_price;
    this.product_type = product_type;
    this.product_shop = product_shop;
    this.product_attribute = product_attribute;
    this.product_quantity = product_quantity;
  }

  async createProduct() {
    return await product.create(this);
  }

  /**
   * Base class method - Update bảng PRODUCT (chứa data chung)
   * Được gọi bởi class con thông qua super.updateProduct()
   * @param {string} productId - ID product
   * @param {object} bodyUpdate - Data cần update (name, price, description...)
   * @returns {object} Document sau khi update (new: true)
   */
  async updateProduct({ productId, bodyUpdate }) {
    return await product.findByIdAndUpdate(productId, bodyUpdate, {
      new: true,
    });
  }
}

class Clothing extends Product {
  async createProduct() {
    const newClothing = await clothing.create({
      ...this.product_attribute,
      product_shop: this.product_shop,
    });
    if (!newClothing) throw new BadRequestError("Create new Clothing error");

    const newProduct = await super.createProduct();
    if (!newProduct) throw new BadRequestError("Create new Product error");
    return newProduct;
  }

  /**
   * Update product loại Clothing
   * Flow:
   *   1. Update bảng CLOTHING (brand, size, material...)
   *   2. Gọi super.updateProduct() để update bảng PRODUCT (name, price...)
   */
  async updateProduct({ productId }) {
    // this = instance Clothing chứa data mới từ payload
    const objectParams = this;

    // Step 1: Nếu có product_attribute → Update bảng CLOTHING
    if (objectParams.product_attribute) {
      await clothing.findByIdAndUpdate(
        productId,
        objectParams.product_attribute,
        { new: true },
      );
    }

    // Step 2: Gọi parent class (Product) để update bảng PRODUCT
    const updateProduct = await super.updateProduct({
      productId,
      bodyUpdate: objectParams, // { product_name, product_price... }
    });
    return updateProduct;
  }
}

class Electronic extends Product {
  async createProduct() {
    // Tạo record trong table Electronic
    const newElectronic = await electronic.create({
      ...this.product_attribute,
      product_shop: this.product_shop,
    });
    if (!newElectronic)
      throw new BadRequestError("Create new Electronic error");
    // Tạo record trong table Product
    const newProduct = await super.createProduct();
    if (!newProduct) throw new BadRequestError("Create new Product error");
    return newProduct;
  }

  
  async updateProduct({ productId }) {
   
    const objectParams = this;

    
    if (objectParams.product_attribute) {
      await electronic.findByIdAndUpdate(
        productId,
        objectParams.product_attribute, 
      );
    }

    
    const updateProduct = await super.updateProduct({
      productId,
      bodyUpdate: objectParams, 
    });
    return updateProduct;
  }
}

module.exports = { Product, ProductFactory, Electronic, Clothing };
