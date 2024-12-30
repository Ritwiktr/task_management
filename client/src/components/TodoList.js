// src/components/TodoList.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { supabase } from '../supabaseClient';
import { useSearchParams } from 'react-router-dom';
import EditTodoModal from './EditTodoModal';

const TodoList = ({ session }) => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [editingTodo, setEditingTodo] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  // Fetch todos with filters
  const fetchTodos = async () => {
    setLoading(true);
    try {
      // Build query params from search params
      const params = new URLSearchParams();
      for (const [key, value] of searchParams.entries()) {
        params.append(key, value);
      }

      const response = await axios.get(`http://localhost:5001/api/todos?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      setTodos(response.data);
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time updates
  useEffect(() => {
    fetchTodos();

    const todoChannel = supabase
      .channel('custom-todos-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTodos(prevTodos => [payload.new, ...prevTodos]);
          } else if (payload.eventType === 'UPDATE') {
            setTodos(prevTodos =>
              prevTodos.map(todo =>
                todo._id === payload.new._id ? payload.new : todo
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setTodos(prevTodos =>
              prevTodos.filter(todo => todo._id !== payload.old._id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(todoChannel);
    };
  }, [searchParams, session]);

  // Sort todos
  const sortedTodos = React.useMemo(() => {
    const sortedArray = [...todos];
    sortedArray.sort((a, b) => {
      if (sortConfig.key === 'deadline') {
        const dateA = a.deadline ? new Date(a.deadline) : new Date(0);
        const dateB = b.deadline ? new Date(b.deadline) : new Date(0);
        return sortConfig.direction === 'asc' 
          ? dateA - dateB 
          : dateB - dateA;
      }
      
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sortedArray;
  }, [todos, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' 
        ? 'desc' 
        : 'asc'
    }));
  };

  const toggleComplete = async (id, isCompleted) => {
    try {
      await axios.put(
        `http://localhost:5001/api/todos/${id}`,
        { isCompleted: !isCompleted },
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );
      setTodos(todos.map(todo => 
        todo._id === id ? { ...todo, isCompleted: !isCompleted } : todo
      ));
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  };

  const deleteTodo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this todo?')) {
      return;
    }
    
    try {
      await axios.delete(`http://localhost:5001/api/todos/${id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      setTodos(todos.filter(todo => todo._id !== id));
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
      low: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
    };
    return colors[priority] || colors.medium;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table Header */}
      <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-t-lg font-semibold">
        <div 
          className="cursor-pointer"
          onClick={() => handleSort('title')}
        >
          Title {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
        <div 
          className="cursor-pointer"
          onClick={() => handleSort('priority')}
        >
          Priority {sortConfig.key === 'priority' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
        <div 
          className="cursor-pointer"
          onClick={() => handleSort('deadline')}
        >
          Deadline {sortConfig.key === 'deadline' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
        <div>Assigned To</div>
        <div>Tags</div>
        <div>Actions</div>
      </div>

      {/* Todo Items */}
      {sortedTodos.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No todos found. Try adjusting your filters or create a new todo.
        </div>
      ) : (
        sortedTodos.map((todo) => (
          <div
            key={todo._id}
            className={`grid grid-cols-6 gap-4 p-4 rounded-lg shadow ${
              todo.isCompleted 
                ? 'bg-gray-50 dark:bg-gray-700' 
                : 'bg-white dark:bg-gray-800'
            }`}
          >
            {/* Title and Description */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={todo.isCompleted}
                onChange={() => toggleComplete(todo._id, todo.isCompleted)}
                className="h-5 w-5 rounded border-gray-300"
              />
              <div>
                <h3 className={`font-semibold ${
                  todo.isCompleted ? 'line-through text-gray-500' : ''
                }`}>
                  {todo.title}
                </h3>
                {todo.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {todo.description}
                  </p>
                )}
              </div>
            </div>

            {/* Priority */}
            <div>
              <span className={`px-2 py-1 rounded-full text-sm ${getPriorityColor(todo.priority)}`}>
                {todo.priority}
              </span>
            </div>

            {/* Deadline */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {todo.deadline && format(new Date(todo.deadline), 'MMM d, yyyy')}
            </div>

            {/* Assigned To */}
            <div className="flex flex-wrap gap-1">
              {todo.assignedTo?.map((email) => (
                <span
                  key={email}
                  className="px-2 py-1 bg-purple-100 dark:bg-purple-800 rounded-full text-sm"
                >
                  {email}
                </span>
              ))}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {todo.tags?.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setEditingTodo(todo)}
                className="text-blue-500 hover:text-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => deleteTodo(todo._id)}
                className="text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}

      {/* Edit Modal */}
      {editingTodo && (
        <EditTodoModal
          todo={editingTodo}
          onClose={() => setEditingTodo(null)}
          onUpdate={(updatedTodo) => {
            setTodos(todos.map(t => 
              t._id === updatedTodo._id ? updatedTodo : t
            ));
            setEditingTodo(null);
          }}
          session={session}
        />
      )}
    </div>
  );
};

export default TodoList;