import React from 'react';
import { useSearchParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const TodoFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const handleFilterChange = (key, value) => {
    if (value) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">Search</label>
          <input
            type="text"
            placeholder="Search todos..."
            value={searchParams.get('search') || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">Priority</label>
          <select
            value={searchParams.get('priority') || ''}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
          >
            <option value="">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">Status</label>
          <select
            value={searchParams.get('completed') || ''}
            onChange={(e) => handleFilterChange('completed', e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
          >
            <option value="">All</option>
            <option value="true">Completed</option>
            <option value="false">Active</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">Deadline</label>
          <DatePicker
            selected={searchParams.get('deadline') ? new Date(searchParams.get('deadline')) : null}
            onChange={(date) => handleFilterChange('deadline', date?.toISOString())}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
            placeholderText="Filter by deadline"
            isClearable
            dateFormat="yyyy-MM-dd"
          />
        </div>
      </div>
    </div>
  );
};

export default TodoFilters;