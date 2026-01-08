const mongoose = require('mongoose');
const environment = require('./environment');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(environment.mongodbUri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('MongoDB disconnect error:', error.message);
    throw error;
  }
};

module.exports = { connectDB, disconnectDB };
