"use strict";

const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Ecommerce Backend API",
    version: "1.0.0",
    description: [
      "Swagger documentation for ecommerce APIs.",
      "",
      "Business Rules:",
      "- Every /api/v1/* route requires x-api-key.",
      "- Role-based access is enforced by JWT role claim.",
      "- Checkout order creation supports x-idempotency-key.",
      "- Shop order status update enforces ownership and transition rules.",
    ].join("\n"),
  },
  servers: [
    {
      url: "http://localhost:8386",
      description: "Local",
    },
  ],
  tags: [
    { name: "Auth" },
    { name: "Product" },
    { name: "Checkout" },
    { name: "Cart" },
    { name: "Discount" },
    { name: "Comment" },
    { name: "Payment" },
    { name: "Notification" },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
      },
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      RefreshTokenHeader: {
        type: "apiKey",
        in: "header",
        name: "x-refresh-token",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          code: { type: "number", example: 400 },
          errorCode: { type: "string", example: "BAD_REQUEST_ERROR" },
          message: { type: "string", example: "Validation error" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "user@mail.com" },
          password: { type: "string", example: "Password@123" },
          accountType: {
            type: "string",
            enum: ["user", "shop"],
            example: "user",
          },
        },
      },
      ProductCreateRequest: {
        type: "object",
        required: [
          "product_name",
          "product_thump",
          "product_price",
          "product_quantity",
          "product_type",
          "product_attribute",
        ],
        properties: {
          product_name: { type: "string", example: "iPhone 15" },
          product_thump: {
            type: "string",
            example: "https://example.com/iphone.jpg",
          },
          product_description: { type: "string", example: "Apple iPhone" },
          product_price: { type: "number", example: 999 },
          product_quantity: { type: "number", example: 100 },
          product_type: {
            type: "string",
            enum: ["Electronics", "Clothing", "Furniture", "Books"],
          },
          product_attribute: { type: "object", additionalProperties: true },
        },
      },
      CheckoutOrderRequest: {
        type: "object",
        required: ["cartId", "shop_order_ids"],
        properties: {
          cartId: { type: "string", example: "65f9f529eaf0f98f6e3537ac" },
          user_address: {
            type: "object",
            properties: {
              street: { type: "string", example: "123 Test Street" },
              city: { type: "string", example: "HCM" },
              country: { type: "string", example: "VN" },
            },
          },
          user_payment: {
            type: "object",
            properties: {
              method: {
                type: "string",
                enum: ["COD", "credit_card", "paypal", "bank_transfer"],
              },
            },
          },
          shop_order_ids: {
            type: "array",
            items: {
              type: "object",
              properties: {
                shopId: { type: "string" },
                shop_discounts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      codeId: { type: "string" },
                      shopId: { type: "string" },
                    },
                  },
                },
                item_products: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      productId: { type: "string" },
                      quantity: { type: "number", example: 1 },
                      price: { type: "number", example: 100 },
                    },
                  },
                },
              },
            },
          },
        },
      },
      ShopOrderStatusRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
          },
        },
      },
      MockPaymentConfirmRequest: {
        type: "object",
        properties: {
          transactionRef: {
            type: "string",
            example: "PAY-order-1234-abcd1234",
          },
        },
      },
      CartItemRequest: {
        type: "object",
        required: ["productId", "quantity"],
        properties: {
          productId: { type: "string", example: "65f9f529eaf0f98f6e3537ac" },
          quantity: { type: "number", example: 2 },
          old_quantity: { type: "number", example: 1 },
          price: { type: "number", example: 100 },
          shopId: { type: "string", example: "65f9f529eaf0f98f6e3537aa" },
          name: { type: "string", example: "iPhone 15" },
        },
      },
      DiscountAmountRequest: {
        type: "object",
        required: ["codeId", "shopId", "products"],
        properties: {
          codeId: { type: "string", example: "TET2026" },
          shopId: { type: "string", example: "65f9f529eaf0f98f6e3537aa" },
          products: {
            type: "array",
            items: {
              type: "object",
              properties: {
                productId: { type: "string" },
                quantity: { type: "number", example: 1 },
                price: { type: "number", example: 100 },
              },
            },
          },
        },
      },
      CreateDiscountRequest: {
        type: "object",
        required: [
          "code",
          "start_date",
          "end_date",
          "name",
          "description",
          "type",
          "value",
          "max_users",
          "max_uses_per_user",
          "min_order_value",
          "applies_to",
        ],
        properties: {
          code: { type: "string", example: "TET2026" },
          start_date: { type: "string", format: "date-time" },
          end_date: { type: "string", format: "date-time" },
          is_active: { type: "boolean", example: true },
          min_order_value: { type: "number", example: 0 },
          product_ids: { type: "array", items: { type: "string" } },
          applies_to: {
            type: "string",
            enum: ["all", "specific"],
            example: "all",
          },
          name: { type: "string", example: "Tet Sale" },
          description: { type: "string", example: "Discount for Tet campaign" },
          type: {
            type: "string",
            enum: ["fixed_amount", "percentage"],
            example: "percentage",
          },
          value: { type: "number", example: 10 },
          max_users: { type: "number", example: 1000 },
          users_count: { type: "number", example: 0 },
          max_uses_per_user: { type: "number", example: 1 },
        },
      },
    },
  },
  paths: {
    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login with email and password",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: { description: "Login success" },
          400: {
            description: "Login failed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/refresh-token": {
      post: {
        tags: ["Auth"],
        summary: "Rotate refresh token",
        security: [{ ApiKeyAuth: [] }, { RefreshTokenHeader: [] }],
        responses: {
          200: { description: "Refresh token success" },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout current refresh token",
        security: [{ ApiKeyAuth: [] }, { RefreshTokenHeader: [] }],
        responses: {
          200: { description: "Logout success" },
        },
      },
    },
    "/api/v1/product": {
      post: {
        tags: ["Product"],
        summary: "Create product (shop only)",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ProductCreateRequest" },
            },
          },
        },
        responses: {
          201: { description: "Product created" },
          403: {
            description: "Forbidden",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/product/publish/{id}": {
      post: {
        tags: ["Product"],
        summary: "Publish product (shop only)",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Publish success" },
        },
      },
    },
    "/api/v1/product/unpublish/{id}": {
      post: {
        tags: ["Product"],
        summary: "Unpublish product (shop only)",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Unpublish success" },
        },
      },
    },
    "/api/v1/checkout/order": {
      post: {
        tags: ["Checkout"],
        summary: "Create order (customer/admin)",
        description: [
          "Role: customer, admin",
          "Idempotency: send x-idempotency-key to safely retry without duplicate orders.",
          "Inventory: stock is reserved per line item and rolled back on failure.",
        ].join("\n"),
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          {
            in: "header",
            name: "x-idempotency-key",
            required: false,
            schema: { type: "string", maxLength: 128 },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CheckoutOrderRequest" },
            },
          },
        },
        responses: {
          201: { description: "Order created" },
          400: {
            description: "Validation or business error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/checkout/orders/{orderId}/status": {
      patch: {
        tags: ["Checkout"],
        summary: "Update order status (shop only)",
        description: [
          "Role: shop",
          "Ownership: shop must own at least one order item.",
          "Transition: pending->confirmed, confirmed->shipped, shipped->delivered.",
          "Cancellation: shop cannot set cancelled; customer cancellation flow must be used.",
        ].join("\n"),
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "orderId",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ShopOrderStatusRequest" },
            },
          },
        },
        responses: {
          200: { description: "Status updated" },
          403: {
            description: "Forbidden",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/cart": {
      post: {
        tags: ["Cart"],
        summary: "Add item to cart",
        description: "Role: customer, admin",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CartItemRequest" },
            },
          },
        },
        responses: {
          201: { description: "Add to cart success" },
          400: {
            description: "Business validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      get: {
        tags: ["Cart"],
        summary: "Get current active cart",
        description: "Role: customer, admin",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        responses: {
          200: { description: "Get cart success" },
        },
      },
      delete: {
        tags: ["Cart"],
        summary: "Delete current active cart",
        description: "Role: customer, admin",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        responses: {
          200: { description: "Delete cart success" },
        },
      },
    },
    "/api/v1/cart/v2": {
      post: {
        tags: ["Cart"],
        summary: "Update cart via shop_order_ids format",
        description: "Role: customer, admin",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        responses: {
          200: { description: "Update cart success" },
        },
      },
    },
    "/api/v1/cart/update": {
      patch: {
        tags: ["Cart"],
        summary: "Update cart item quantity",
        description: "Role: customer, admin",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CartItemRequest" },
            },
          },
        },
        responses: {
          200: { description: "Update quantity success" },
        },
      },
    },
    "/api/v1/cart/item": {
      delete: {
        tags: ["Cart"],
        summary: "Delete item from cart",
        description: "Role: customer, admin",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["productId"],
                properties: {
                  productId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Delete item success" },
        },
      },
    },
    "/api/v1/cart/state": {
      patch: {
        tags: ["Cart"],
        summary: "Update cart state",
        description:
          "Role: customer, admin. Allowed states: active, completed, failed, pending.",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["state"],
                properties: {
                  state: {
                    type: "string",
                    enum: ["active", "completed", "failed", "pending"],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Update cart state success" },
        },
      },
    },
    "/api/v1/discount/products": {
      get: {
        tags: ["Discount"],
        summary: "Get products eligible for a discount code",
        description: "Public endpoint",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "code",
            required: true,
            schema: { type: "string" },
          },
          {
            in: "query",
            name: "shopId",
            required: true,
            schema: { type: "string" },
          },
          {
            in: "query",
            name: "limit",
            required: false,
            schema: { type: "number", default: 20 },
          },
          {
            in: "query",
            name: "page",
            required: false,
            schema: { type: "number", default: 1 },
          },
        ],
        responses: {
          200: { description: "Get products with discount success" },
        },
      },
    },
    "/api/v1/discount/amount": {
      post: {
        tags: ["Discount"],
        summary: "Calculate discount amount",
        description: "Role: customer, admin",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DiscountAmountRequest" },
            },
          },
        },
        responses: {
          200: { description: "Calculate discount amount success" },
        },
      },
    },
    "/api/v1/discount/cancel": {
      post: {
        tags: ["Discount"],
        summary: "Cancel applied discount for a user",
        description: "Role: customer, admin",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["codeId", "shopId"],
                properties: {
                  codeId: { type: "string" },
                  shopId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Cancel discount code success" },
        },
      },
    },
    "/api/v1/discount": {
      post: {
        tags: ["Discount"],
        summary: "Create discount code",
        description: "Role: shop",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateDiscountRequest" },
            },
          },
        },
        responses: {
          201: { description: "Create discount code success" },
        },
      },
      get: {
        tags: ["Discount"],
        summary: "Get discount codes by shop",
        description: "Role: shop",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "limit",
            required: false,
            schema: { type: "number", default: 20 },
          },
          {
            in: "query",
            name: "page",
            required: false,
            schema: { type: "number", default: 1 },
          },
        ],
        responses: {
          200: { description: "Get discount codes success" },
        },
      },
    },
    "/api/v1/discount/{discountId}": {
      patch: {
        tags: ["Discount"],
        summary: "Update discount code",
        description: "Role: shop",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "discountId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Update discount code success" },
        },
      },
    },
    "/api/v1/discount/{codeId}": {
      delete: {
        tags: ["Discount"],
        summary: "Delete discount code",
        description: "Role: shop",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "codeId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Delete discount code success" },
        },
      },
    },
    "/api/v1/comment": {
      get: {
        tags: ["Comment"],
        summary: "Get all comments",
        description: "Public endpoint",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: { description: "Get all comments success" },
        },
      },
      post: {
        tags: ["Comment"],
        summary: "Create comment",
        description:
          "Protected endpoint. Route currently enforces role 'user' in code.",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: true,
              },
            },
          },
        },
        responses: {
          200: { description: "Create comment success" },
        },
      },
    },
    "/api/v1/comment/{productId}": {
      get: {
        tags: ["Comment"],
        summary: "Get comments by product",
        description: "Public endpoint",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "productId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Get comments by product success" },
        },
      },
    },
    "/api/v1/comment/{commentId}": {
      patch: {
        tags: ["Comment"],
        summary: "Update comment",
        description:
          "Protected endpoint. Route currently enforces role 'user' in code.",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "commentId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Update comment success" },
        },
      },
      delete: {
        tags: ["Comment"],
        summary: "Delete comment",
        description:
          "Protected endpoint. Route currently enforces role 'user' in code.",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "commentId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Delete comment success" },
        },
      },
    },
    "/api/v1/payment/orders/{orderId}": {
      get: {
        tags: ["Payment"],
        summary: "Get payment detail by order",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "orderId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Payment detail" },
        },
      },
    },
    "/api/v1/payment/orders/{orderId}/confirm": {
      post: {
        tags: ["Payment"],
        summary: "Confirm mock payment for non-COD orders",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "orderId",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MockPaymentConfirmRequest" },
            },
          },
        },
        responses: {
          200: { description: "Payment confirmed" },
        },
      },
    },
    "/api/v1/notification": {
      get: {
        tags: ["Notification"],
        summary: "List current actor notifications",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        responses: {
          200: { description: "Notification list" },
        },
      },
    },
    "/api/v1/notification/{notificationId}/read": {
      patch: {
        tags: ["Notification"],
        summary: "Mark a notification as read",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "notificationId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Notification updated" },
        },
      },
    },
  },
};

module.exports = openapiSpec;
