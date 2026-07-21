import { motion } from 'framer-motion';

const GoldTabButton = ({ icon: Icon, label, onClick, delay = 0 }) => {
  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ scale: 1.05, x: 5 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex items-center space-x-3 bg-gradient-to-r from-yellow-700 to-yellow-500 text-yellow-50 px-6 py-3 rounded-r-xl border-y border-r border-yellow-300/30 shadow-[4px_4px_10px_rgba(0,0,0,0.5)] hover:shadow-[6px_6px_15px_rgba(0,0,0,0.6)] relative overflow-hidden group"
    >
      {/* Glossy sheen */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
      
      <Icon className="w-5 h-5 text-yellow-100 group-hover:text-white transition-colors" />
      <span className="font-semibold tracking-wide text-sm drop-shadow-md">{label}</span>
    </motion.button>
  );
};

export default GoldTabButton;
