const { Schema, model } = require("mongoose");

const blog = Schema({
  blogtype_id: String,
  content: String,
  date: { type: Date, default: Date.now },
  intro: String,
  subtitle: String,
  title: String,
  titleImage: String,
  updatetime: { type: Date, default: Date.now },
  user_id: String
});

model('blog', blog);
