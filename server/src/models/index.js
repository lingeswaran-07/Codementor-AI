import mongoose from 'mongoose';
const { Schema, model } = mongoose;

export const User = model('User', new Schema({
  name: String,
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  passwordHash: String,                       // email/password accounts
  githubId: { type: String, unique: true, sparse: true }, // GitHub accounts
  avatar: String,
  githubToken: String,                        // encrypt in production
}, { timestamps: true }));

export const Repo = model('Repo', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  fullName: String,
  status: { type: String, enum: ['indexing', 'ready', 'failed'], default: 'indexing' },
  filesIndexed: { type: Number, default: 0 },
  chunkCount: { type: Number, default: 0 },
  error: String,
}, { timestamps: true }));

export const Chunk = model('Chunk', new Schema({
  repo: { type: Schema.Types.ObjectId, ref: 'Repo', index: true },
  path: String,
  startLine: Number,
  endLine: Number,
  text: String,
  embedding: [Number],
}));

// One saved conversation per user per repository
const chatSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  repo: { type: Schema.Types.ObjectId, ref: 'Repo' },
  messages: [{
    role: { type: String, enum: ['user', 'ai'] },
    text: String,
    sources: [{ path: String, startLine: Number, endLine: Number, _id: false }],
    createdAt: { type: Date, default: Date.now },
    _id: false,
  }],
}, { timestamps: true });
chatSchema.index({ user: 1, repo: 1 }, { unique: true });
export const Chat = model('Chat', chatSchema);
