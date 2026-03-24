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
const { BadRequestError, NotFoundError } = require("../helpers/error.response");
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
  static buildPaginationInput(query = {}, defaultLimit = 20, maxLimit = 100) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const rawLimit = parseInt(query.limit, 10) || defaultLimit;
    const limit = Math.min(Math.max(rawLimit, 1), maxLimit);
    return { page, limit };
  }

  static buildSortInput(query = {}, defaultSortBy = "createdAt") {
    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "product_price",
      "product_name",
    ];

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

  static buildPublicProductFilter(query = {}) {
    const filter = { isPublished: true };

    const type = query.type || query.category;
    if (type) {
      filter.product_type = type;
    }

    const minPrice = Number(query.minPrice);
    const maxPrice = Number(query.maxPrice);
    if (!Number.isNaN(minPrice) || !Number.isNaN(maxPrice)) {
      filter.product_price = {};
      if (!Number.isNaN(minPrice)) filter.product_price.$gte = minPrice;
      if (!Number.isNaN(maxPrice)) filter.product_price.$lte = maxPrice;
    }

    if (query.shopId) {
      filter.product_shop = query.shopId;
    }

    if (query.search) {
      const keyword = String(query.search).trim();
      if (keyword) {
        filter.$or = [
          { product_name: { $regex: keyword, $options: "i" } },
          { product_description: { $regex: keyword, $options: "i" } },
        ];
      }
    }

    return filter;
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

  static async findAllDraftForShop({ product_shop, query = {} }) {
    const { page, limit } = ProductFactory.buildPaginationInput(query, 20, 100);
    const { sortByField, order, sortBy } = ProductFactory.buildSortInput(
      query,
      "updatedAt",
    );
    const filterQuery = { product_shop, isDraft: true };
    const result = await findAllDraftShopRepo({
      query: filterQuery,
      limit,
      page,
      sortBy,
    });

    return {
      items: result.items,
      pagination: ProductFactory.buildPaginationMeta({
        page,
        limit,
        totalItems: result.totalItems,
      }),
      sort: {
        sortBy: sortByField,
        order: order === 1 ? "asc" : "desc",
      },
      filters: {
        state: "draft",
      },
    };
  }

  static async findAllProducts(query) {
    const { page, limit } = ProductFactory.buildPaginationInput(query, 20, 100);
    const { sortByField, order, sortBy } = ProductFactory.buildSortInput(query);
    const filter = ProductFactory.buildPublicProductFilter(query);

    const cacheKey = CacheKeys.product.list({
      page,
      limit,
      sort: `${sortByField}:${order === 1 ? "asc" : "desc"}`,
      category: query.type || query.category || "",
      search: query.search || "",
    });

    const cachedProducts = await getCache(cacheKey);
    if (cachedProducts) return cachedProducts;

    const products = await findAllProductsRepo({
      limit,
      page,
      sortBy,
      filter,
    });

    const payload = {
      items: products.items,
      pagination: ProductFactory.buildPaginationMeta({
        page,
        limit,
        totalItems: products.totalItems,
      }),
      sort: {
        sortBy: sortByField,
        order: order === 1 ? "asc" : "desc",
      },
      filters: {
        search: query.search || "",
        type: query.type || query.category || "",
        minPrice:
          query.minPrice !== undefined
            ? Number(query.minPrice) || 0
            : undefined,
        maxPrice:
          query.maxPrice !== undefined
            ? Number(query.maxPrice) || 0
            : undefined,
        shopId: query.shopId || "",
      },
    };

    await setCache(cacheKey, payload, DEFAULT_TTL);

    return payload;
  }

  static async findAllPublishedForShop({ product_shop, query = {} }) {
    const { page, limit } = ProductFactory.buildPaginationInput(query, 20, 100);
    const { sortByField, order, sortBy } = ProductFactory.buildSortInput(
      query,
      "updatedAt",
    );
    const filterQuery = { product_shop, isPublished: true };
    const result = await findAllPublishedShopRepo({
      query: filterQuery,
      limit,
      page,
      sortBy,
    });

    return {
      items: result.items,
      pagination: ProductFactory.buildPaginationMeta({
        page,
        limit,
        totalItems: result.totalItems,
      }),
      sort: {
        sortBy: sortByField,
        order: order === 1 ? "asc" : "desc",
      },
      filters: {
        state: "published",
      },
    };
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
    const productShop = payload.product_shop;

    switch (type) {
      case "Electronics":
        // Tạo instance Electronic với data mới, sau đó gọi updateProduct()
        return new Electronic(payload).updateProduct({
          productId,
          productShop,
        });
      case "Clothing":
        // Tạo instance Clothing với data mới, sau đó gọi updateProduct()
        return new Clothing(payload).updateProduct({
          productId,
          productShop,
        });
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
  async updateProduct({ productId, productShop, bodyUpdate }) {
    const updatedProduct = await product.findOneAndUpdate(
      {
        _id: productId,
        product_shop: productShop,
      },
      bodyUpdate,
      {
        new: true,
      },
    );

    if (!updatedProduct) {
      throw new NotFoundError("Product not found or access denied");
    }

    return updatedProduct;
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
  async updateProduct({ productId, productShop }) {
    // this = instance Clothing chứa data mới từ payload
    const objectParams = this;

    // Step 1: Nếu có product_attribute → Update bảng CLOTHING
    if (objectParams.product_attribute) {
      const updatedClothing = await clothing.findOneAndUpdate(
        {
          _id: productId,
          product_shop: productShop,
        },
        objectParams.product_attribute,
        { new: true },
      );

      if (!updatedClothing) {
        throw new NotFoundError("Product not found or access denied");
      }
    }

    // Step 2: Gọi parent class (Product) để update bảng PRODUCT
    const updateProduct = await super.updateProduct({
      productId,
      productShop,
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

  async updateProduct({ productId, productShop }) {
    const objectParams = this;

    if (objectParams.product_attribute) {
      const updatedElectronic = await electronic.findOneAndUpdate(
        {
          _id: productId,
          product_shop: productShop,
        },
        objectParams.product_attribute,
        { new: true },
      );

      if (!updatedElectronic) {
        throw new NotFoundError("Product not found or access denied");
      }
    }

    const updateProduct = await super.updateProduct({
      productId,
      productShop,
      bodyUpdate: objectParams,
    });
    return updateProduct;
  }
}

module.exports = { Product, ProductFactory, Electronic, Clothing };
