import express from 'express';
import Todo from '../models/Todo.js';
import { todoSchema, updateTodoSchema } from '../todoSchema.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const todos = await Todo.find().populate('user', 'username email');
    res.json(todos);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const todo = await Todo.findById(req.params.id).populate('user', 'username email');
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    res.json(todo);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validatedData = todoSchema.parse(req.body);
    const newTodo = await Todo.create(validatedData);
    res.status(201).json(newTodo);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validatedData = updateTodoSchema.parse(req.body);
    const updatedTodo = await Todo.findByIdAndUpdate(
      req.params.id,
      { $set: validatedData },
      { new: true, runValidators: true }
    );
    if (!updatedTodo) return res.status(404).json({ error: 'Todo not found' });
    res.json(updatedTodo);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deletedTodo = await Todo.findByIdAndDelete(req.params.id);
    if (!deletedTodo) return res.status(404).json({ error: 'Todo not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
