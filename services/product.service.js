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
const { invalidateProductCache } = require("../helpers/cache");
const { clothing, product, electronic } = require("../models/product.model");
const { insertInventory } = require("../models/repositories/inventory.repo");
const productRepo = require("../models/repositories/product.repo");
const {
  getCache,
  setCache,
  DEFAULT_TTL,
} = require("../utils/cache/cache.service");
const CacheKeys = require("../utils/cache/cache.keys");

const {
  findAllDraftShop: findAllDraftShopRepo,
  findAllProducts: findAllProductsRepo,
  findAllPublishedShop: findAllPublishedShopRepo,
  searchProductByUser: searchProductByUserRepo,
  findProduct: findProductRepo,
} = productRepo;

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
    const query = { product_shop, isDraft: true };
    return await findAllDraftShopRepo({ query, limit, skip });
  }

  static async findAllProducts(query) {
    const page = +query.page || 1;
    const limit = +query.limit || 50;
    const sort = query.sort || "ctime";

    const cacheKey = CacheKeys.product.list({
      page,
      limit,
      sort,
      category: query.category || "",
      search: query.search || "",
    });

    const cachedProducts = await getCache(cacheKey);
    if (cachedProducts) return cachedProducts;

    const products = await findAllProductsRepo({
      limit,
      sort,
      page,
      filter: { isPublished: true },
    });

    await setCache(cacheKey, products, DEFAULT_TTL);

    return products;
  }

  static async findAllPublishedForShop({ product_shop, limit = 50, skip = 0 }) {
    const query = { product_shop, isPublished: true };
    return await findAllPublishedShopRepo({ query, limit, skip });
  }

  static async searchProducts({ keySearch }) {
    return await searchProductByUserRepo({ keySearch });
  }

  static async findProduct({ product_id }) {
    const cacheKey = CacheKeys.product.detail(product_id);
    const cachedProduct = await getCache(cacheKey);
    if (cachedProduct) return cachedProduct; //Nếu thấy cache product thì return product

    const foundProduct = await findProductRepo({
      product_id,
      unSelect: ["__v", "product_variations"],
    });
    /// Không thì find database xong setCache rồi trả về product
    if (foundProduct) {
      await setCache(cacheKey, foundProduct, DEFAULT_TTL);
    }

    return foundProduct;
  }

  static async publishProductByShop({ product_shop, product_id }) {
    const result = await product.findOneAndUpdate(
      { _id: product_id, product_shop },
      { isPublished: true, isDraft: false },
      { new: true },
    );

    if (result) {
      await invalidateProductCache(product_id);
    }

    return result;
  }

  static async unPublishProductByShop({ product_shop, product_id }) {
    const result = await product.findOneAndUpdate(
      { _id: product_id, product_shop },
      { isPublished: false, isDraft: true },
      { new: true },
    );

    if (result) {
      await invalidateProductCache(product_id);
    }

    return result;
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

  async createProduct(product_id) {
    const payload = product_id ? { ...this, _id: product_id } : this;
    const newProduct = await product.create(payload);

    if (newProduct) {
      await insertInventory({
        productId: newProduct._id,
        shopId: this.product_shop,
        stock: this.product_quantity,
      });

      await invalidateProductCache(newProduct._id);
    }

    return newProduct;
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

    const newProduct = await super.createProduct(newClothing._id);
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
    const newProduct = await super.createProduct(newElectronic._id);
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
