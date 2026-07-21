
export const GlassCard = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-2xl p-6 transition-all duration-300 hover:shadow-lg border border-white/20 dark:border-white/5 ${className} ${
        onClick ? 'cursor-pointer hover:scale-[1.01]' : ''
      }`}
    >
      {children}
    </div>
  );
};

export default GlassCard;
