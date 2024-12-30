// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import TodoList from './components/TodoList';
import TodoForm from './components/TodoForm';
import TodoFilters from './components/TodoFilters';
import LoginForm from './components/LoginForm';
import ResetPassword from './components/ResetPassword';
import './styles/App.css';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const App = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up Supabase auth listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider>
      <Router>
        <div className="app">
          <Routes>
            {/* Login and Reset Password Routes */}
            {!session ? (
              <>
                <Route path="/" element={<LoginForm />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              </>
            ) : (
              <>
                {/* Authenticated Routes */}
                <Route
                  path="/"
                  element={
                    <>
                      <Navbar session={session} />
                      <div className="container mx-auto px-4 py-8">
                        <TodoForm session={session} />
                        <TodoFilters />
                        <TodoList session={session} />
                      </div>
                    </>
                  }
                />
              </>
            )}
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;
