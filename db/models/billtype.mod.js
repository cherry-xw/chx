const { Schema, model } = require("mongoose");

const billtype = Schema({
  id: { type: String },
  createtime: { type: Date, default: Date.now },
  updatetime: { type: Date, default: Date.now },
  intro: String,
  typename: String,
  user_id: String
});

model('billtype', billtype);
