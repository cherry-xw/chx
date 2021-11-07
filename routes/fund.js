const express = require('express');
const router = express.Router();

router.get('/fundGroup', function (req, res) {
  const id = req.query.id
  if (id === "VevWh3vxVVtJLb") {
    res.json({
      status: true,
      data: require("../static/hkl")
    })
  } else {
    res.json({
      status: false,
      data: []
    })
  }
})

module.exports = router;
