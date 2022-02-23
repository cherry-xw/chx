const { Schema, model } = require("mongoose");

const user = Schema({
  _id: { type: String},
  id: { type: String },
  createtime: { type: Date, default: Date.now },
  password: String,
  username: String
});

model('user', user);
