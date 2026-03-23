const { model, Schema, Types } = require("mongoose");

const DOCUMENT_NAME = "Discount";
const COLLECTION_NAME = "Discounts";

const discountSchema = new Schema(
  {
    discount_name: { type: String, required: true },
    discount_description: { type: String, required: true },
    discount_type: { type: String, default: "fixed_amount" }, // percentage
    discount_value: { type: Number, required: true }, //10.000 , 10
    discount_code: { type: String, required: true },
    discount_start_date: { type: Date, required: true }, //Ngày bắt đầu
    discount_end_date: { type: Date, required: true }, // Ngày kết thúc
    discount_max_users: { type: Number, required: true }, //Số lượng disocunt được áp dụng
    discount_cout_user: { type: Number, required: true }, // Số discount đã sử dụng
    discount_user_used: { type: Array, default: [] }, // Ai đã dùng code
    discount_max_user_per_user: { type: Number, required: true },
    disocunt_min_order_value: { type: Number, required: true },
    discount_shopId: { type: Schema.Types.ObjectId, ref: "Shop" },
    discount_is_active: { type: Boolean, default: true },
    discount_applies_to: {
      type: String,
      required: true,
      enum: ["all", "specific"],
    },
    discount_product_ids: { type: Array, default: [] }, //Sản phẩm được áp dụng
  },
  { timestamps: true, collection: COLLECTION_NAME },
);
module.exports = { discount: model(DOCUMENT_NAME, discountSchema) };
