import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      {/* Add more routes here later */}
    </Routes>
  );
}

export default App;
