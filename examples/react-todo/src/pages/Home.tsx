import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Welcome to Todo App
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        A simple todo application built with React, TypeScript, and Tailwind CSS.
      </p>
      <Link
        to="/todos"
        className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Get Started
      </Link>
    </div>
  );
}
