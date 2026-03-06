import { Routes, Route, Link } from 'react-router-dom';
import { Home } from './pages/Home';
import { TodoList } from './pages/TodoList';
import { About } from './pages/About';

export function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="text-xl font-bold text-gray-900">
              Todo App
            </Link>
            <div className="flex gap-4">
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Home
              </Link>
              <Link
                to="/todos"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Todos
              </Link>
              <Link
                to="/about"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                About
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/todos" element={<TodoList />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
    </div>
  );
}
