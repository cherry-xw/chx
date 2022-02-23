const { Schema, model } = require("mongoose");

const bill = Schema({
  billtype_id: { type: String },
  consumetime: { type: Date, default: Date.now },
  date: { type: Date, default: Date.now },
  intro: String,
  price: Number,
  updatetime: { type: Date, default: Date.now },
  user_id: String
});

model('bill', bill);
