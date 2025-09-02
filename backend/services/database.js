const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ledgerknight';

let connected = false;

const connectMongo = async () => {
  if (connected) return;
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
  });
  connected = true;
  console.log('Mongo connected');
};

const withMongo = async () => {
  if (!connected) await connectMongo();
  return mongoose;
};

module.exports = { connectMongo, withMongo };
