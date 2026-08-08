const Skeleton = ({ variant = 'text', className = '' }) => {
  const variants = {
    text: 'h-4 w-full rounded',
    card: 'h-24 w-full rounded-lg',
    chart: 'h-64 w-full rounded-lg',
  };

  return (
    <div
      className={`animate-pulse bg-neutral-300/60 dark:bg-neutral-700/60 ${variants[variant]} ${className}`}
      aria-hidden="true"
    />
  );
};

export default Skeleton;