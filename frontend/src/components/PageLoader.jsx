import { BookOpen } from 'lucide-react';

const PageLoader = () => {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-amber-900 via-stone-900 to-stone-950">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-gradient-to-br from-amber-800 to-amber-950 p-3 rounded-xl shadow-lg border border-amber-500/30">
          <BookOpen className="h-6 w-6 text-white animate-pulse" />
        </div>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent"></div>
      </div>
    </div>
  );
};

export default PageLoader;
