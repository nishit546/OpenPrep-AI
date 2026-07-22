
const NotebookLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-200 dark:bg-slate-900 p-4 sm:p-8 flex items-center justify-center">
      {/* Notebook Container */}
      <div className="relative w-full max-w-6xl bg-white dark:bg-slate-800 shadow-2xl rounded-r-2xl rounded-l-md flex min-h-[85vh]">
        
        {/* Binder Rings */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-evenly py-10 z-20 pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center -ml-4">
              <div className="w-5 h-5 rounded-full bg-slate-800 dark:bg-black shadow-inner z-10" />
              <div className="w-10 h-3 bg-gradient-to-r from-slate-400 to-slate-200 dark:from-slate-600 dark:to-slate-400 rounded-r-md border border-slate-500 shadow-sm -ml-2" />
            </div>
          ))}
        </div>

        {/* Page Content with Ruled Lines */}
        <div className="w-full ml-12 pl-24 pr-12 py-8 notebook-lines relative overflow-hidden">
          {/* Red margin line */}
          <div className="notebook-margin-line" />
          
          <div className="relative z-20">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotebookLayout;
