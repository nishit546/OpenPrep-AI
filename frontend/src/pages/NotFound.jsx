import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-900 via-stone-900 to-stone-950 p-4">
      <div className="w-full max-w-md bg-gradient-to-br from-amber-50 to-amber-100 rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-amber-700/50 p-8 text-center">
        <div className="mb-6">
          <span className="font-playfair text-7xl font-extrabold text-amber-800/20 select-none">
            404
          </span>
        </div>

        <h1 className="text-2xl font-bold font-playfair text-stone-900 mb-2">
          Page Not Found
        </h1>
        <p className="text-stone-600 text-sm mb-6">
          The page you are looking for does not exist or has been moved.
        </p>

        <div className="flex flex-col gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-amber-50 font-semibold rounded-sm transition-colors text-sm cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-stone-300 hover:bg-slate-50 text-stone-700 font-semibold rounded-sm transition-colors text-sm"
            >
              <BookOpen className="h-4 w-4" />
              Home
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-stone-300 hover:bg-slate-50 text-stone-700 font-semibold rounded-sm transition-colors text-sm"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-stone-300 hover:bg-slate-50 text-stone-700 font-semibold rounded-sm transition-colors text-sm"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
