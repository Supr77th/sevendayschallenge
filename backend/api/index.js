const express = require('express');
const tasksRouter = require('./tasks');

const app = express();
app.use(express.json());
app.use('/api', tasksRouter);

module.exports = app;