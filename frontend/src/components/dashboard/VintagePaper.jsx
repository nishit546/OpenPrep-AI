import { motion } from 'framer-motion';

const VintagePaper = ({ children, className = '', animate = true, delay = 0 }) => {
  const content = (
    <div className={`bg-vintage-paper shadow-paper rounded-sm p-6 relative overflow-hidden ${className}`}>
      {/* Paper texture overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      whileHover={{ y: -5, boxShadow: "4px 8px 20px rgba(0,0,0,0.15)" }}
    >
      {content}
    </motion.div>
  );
};

export default VintagePaper;
