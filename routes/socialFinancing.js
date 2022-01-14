const express = require('express');
const router = express.Router();

router.post('/socialFinancing/upload', async function(req, res) {
  const {
    date,
    RMBLoans,
    ForeignCurrencyDenominatedLoans,
    EntrustedLoans,
    TrustLoans,
    UndiscountedBankersAcceptances,
    NetFinancingCorporateBonds,
    GovernmentBonds,
    EFDSMNFinancialEnterprises,
    ASDFinancialInstitutions,
    LoansWrittenOff
  } = req.body;
  console.log(date);
  try {
    const Model = req.mongo`socialFinancing`;
    const saved = await Model.findOne({date});
    if (!saved) {
      const model = new Model({
        date,
        RMBLoans,
        ForeignCurrencyDenominatedLoans,
        EntrustedLoans,
        TrustLoans,
        UndiscountedBankersAcceptances,
        NetFinancingCorporateBonds,
        GovernmentBonds,
        EFDSMNFinancialEnterprises,
        ASDFinancialInstitutions,
        LoansWrittenOff
      });
      await model.save();
      res.json({
        status: true,
        data: date,
        which: "已存储数据"
      });
    } else {
      res.json({
        status: true,
        data: "数据已存在",
        which: "数据已存在"
      });
    }
  } catch (error) {
    console.error(error);
    res.json({
      status: false,
      which: "访问数据库失败"
    });
  }
});

router.get('/socialFinancing/list', async function(req, res) {
  const Model = req.mongo`socialFinancing`;
  try {
    const saved = await Model.find();
    if (saved?.length) {
      res.json({
        status: true,
        data: saved.map(e => ({
          date: e.date,
          RMBLoans: e.RMBLoans,
          ForeignCurrencyDenominatedLoans: e.ForeignCurrencyDenominatedLoans,
          EntrustedLoans: e.EntrustedLoans,
          TrustLoans: e.TrustLoans,
          UndiscountedBankersAcceptances: e.UndiscountedBankersAcceptances,
          NetFinancingCorporateBonds: e.NetFinancingCorporateBonds,
          GovernmentBonds: e.GovernmentBonds,
          EFDSMNFinancialEnterprises: e.EFDSMNFinancialEnterprises,
          ASDFinancialInstitutions: e.ASDFinancialInstitutions,
          LoansWrittenOff: e.LoansWrittenOff
        }))
      });
    } else {
      res.json({
        status: true,
        data: []
      });
    }
  } catch (error) {
    console.error(error);
    res.json({
      status: false,
      which: "访问数据库失败"
    });
  }
});

module.exports = router;
