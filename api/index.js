// api/index.js
import express from 'express';
import app from '../app.js';

const server = express();
server.use(app);

export default server;
