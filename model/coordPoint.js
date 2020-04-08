const mongoose = require("mongoose");

const PointSchema = mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  {
    _id: false,
  }
);

module.exports = mongoose.model("point", PointSchema);
