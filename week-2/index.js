import express from 'express';
import dotenv from 'dotenv';
import connectDB from './db.js';
import todoRoutes from './routes/todoRoutes.js';
import { errorHandler } from './errorHandler.js';

dotenv.config();

connectDB();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/todos', todoRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Todo API (Week 2 - MongoDB)' });
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
