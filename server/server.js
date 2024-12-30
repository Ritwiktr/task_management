// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Middleware
app.use(express.json());

// Configure CORS
const allowedOrigins = ['http://localhost:3000'];
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Database connection
const mongoURI = 'mongodb://127.0.0.1:27017/todoDB';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Enhanced Todo Schema
const todoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  isCompleted: { type: Boolean, default: false },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  deadline: { type: Date },
  createdAt: { type: Date, default: Date.now },
  userId: { type: String, required: true },
  assignedTo: [{ type: String }], // Array of user IDs
  tags: [{ type: String }]
});

const Todo = mongoose.model('Todo', todoSchema);

// Middleware to verify Supabase token
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) throw error;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Enhanced API Routes

// Get all todos with filtering
app.get('/api/todos', verifyToken, async (req, res) => {
  try {
    const {
      search,
      priority,
      completed,
      deadline,
      assignedTo
    } = req.query;

    let query = { userId: req.user.id };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (priority) {
      query.priority = priority;
    }

    if (completed !== undefined) {
      query.isCompleted = completed === 'true';
    }

    if (deadline) {
      query.deadline = { $lte: new Date(deadline) };
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    const todos = await Todo.find(query).sort({ createdAt: -1 });
    res.json(todos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// Create a new todo
app.post('/api/todos', verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      deadline,
      assignedTo,
      tags
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required' });

    const newTodo = new Todo({
      title,
      description,
      priority,
      deadline,
      assignedTo,
      tags,
      userId: req.user.id
    });

    await newTodo.save();
    res.status(201).json(newTodo);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// Update a todo
app.put('/api/todos/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const todo = await Todo.findOne({ _id: id, userId: req.user.id });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    const updatedTodo = await Todo.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json(updatedTodo);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// Delete a todo
app.delete('/api/todos/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTodo = await Todo.findOneAndDelete({
      _id: id,
      userId: req.user.id
    });

    if (!deletedTodo) return res.status(404).json({ error: 'Todo not found' });

    res.json({ message: 'Todo deleted successfully', deletedTodo });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

const PORT = 5001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));