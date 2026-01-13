const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AIChatSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    messages: { type: [MessageSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

AIChatSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('AIChat', AIChatSchema);
