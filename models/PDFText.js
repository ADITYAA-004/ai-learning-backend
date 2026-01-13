const mongoose = require('mongoose');

const PDFTextSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, unique: true },
    text: { type: String, required: true },
    extractedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// TTL: expire cached PDF text after configured seconds (default 30 days)
const ttl = parseInt(process.env.PDF_CACHE_TTL_SECONDS, 10) || 30 * 24 * 60 * 60;
PDFTextSchema.index({ extractedAt: 1 }, { expireAfterSeconds: ttl });

module.exports = mongoose.model('PDFText', PDFTextSchema);
