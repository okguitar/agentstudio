import React from 'react';
import { showSuccess, showError, showInfo } from '../utils/toast';

export const ToastTestPage: React.FC = () => {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold mb-6">Toast Test Page</h1>

      <div className="space-y-4">
        <button
          onClick={() => showSuccess('Success!', 'This is a success message')}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Show Success Toast
        </button>

        <button
          onClick={() => showError('Error!', 'This is an error message')}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 ml-4"
        >
          Show Error Toast
        </button>

        <button
          onClick={() => showInfo('Info', 'This is an info message')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ml-4"
        >
          Show Info Toast
        </button>
      </div>
    </div>
  );
};
