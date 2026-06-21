// Affiliate program registry for BusinessPolicyGuide
// Update `url` fields once each affiliate program is approved, then run:
//   node inject-affiliates.js
// to replace placeholder hrefs across the entire site.
//
// Slot strategy (configured in inject-affiliates.js):
//   primary   -> hiscox       (top-of-page CTA)
//   secondary -> coverwallet  (bottom-of-page CTA)

module.exports = {
  hiscox: {
    name: "Hiscox",
    url: "PENDING_HISCOX",
    cta: "Get Hiscox Quote"
  },
  next: {
    name: "Next Insurance",
    url: "PENDING_NEXT",
    cta: "Compare Quotes - Next Insurance"
  },
  thimble: {
    name: "Thimble",
    url: "PENDING_THIMBLE",
    cta: "Get On-Demand Coverage"
  },
  coverwallet: {
    name: "CoverWallet",
    url: "PENDING_COVERWALLET",
    cta: "Compare Business Insurance"
  },
  netquote: {
    name: "NetQuote",
    url: "PENDING_NETQUOTE",
    cta: "Compare Multiple Quotes"
  }
};
