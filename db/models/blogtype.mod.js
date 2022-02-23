const { Schema, model } = require("mongoose");

const blogtype = Schema({
  id: { type: String },
  createtime: { type: Date, default: Date.now },
  updatetime: { type: Date, default: Date.now },
  typeName: String,
  user_id: String
});

model('blogtype', blogtype);
