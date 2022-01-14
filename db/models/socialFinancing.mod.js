const {Schema,model} = require("mongoose");

// 社融规模数据
const socialFinancing = Schema({
  createTime: {type: Date, default: Date.now}, // 创建时间
  editTime: {type: Date, default: Date.now}, // 修改时间
  date: String, // 日期
  RMBLoans: Number, // 人民币贷款
  ForeignCurrencyDenominatedLoans: Number, // 外币贷款（折合人民币）
  EntrustedLoans : Number, // 委托贷款
  TrustLoans: Number, // 信托贷款
  UndiscountedBankersAcceptances: Number, // 未贴现银行承兑汇票
  NetFinancingCorporateBonds: Number, // 企业债券
  GovernmentBonds: Number, // 政府债券
  EFDSMNFinancialEnterprises: Number, // 非金融企业境内股票融资
  ASDFinancialInstitutions: Number, // 存款类金融机构资产支持证券
  LoansWrittenOff: Number, // 贷款核销
});
socialFinancing.virtual('messageJSON').get(function() {
  return JSON.parse(this.message);
});

model('socialFinancing', socialFinancing);
