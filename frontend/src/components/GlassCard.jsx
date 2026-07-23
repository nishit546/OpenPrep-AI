
export const GlassCard = ({ children, className = '', onClick }) => {
  const handleKeyDown = (e) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`glass-card rounded-2xl p-6 transition-all duration-300 hover:shadow-lg border border-white/20 dark:border-white/5 ${className} ${
        onClick ? 'cursor-pointer hover:scale-[1.01]' : ''
      }`}
    >
      {children}
    </div>
  );
};

export default GlassCard;
