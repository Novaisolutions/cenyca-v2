import React from 'react';
import { motion } from 'framer-motion';
import { DisplayItem } from '../types/database';
import { MessageCircle } from 'lucide-react';

interface SearchResultItemProps {
  item: DisplayItem;
  onSelect: () => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ item, onSelect }) => {
  return (
    <motion.div
      layout
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 10 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onSelect}
      className="flex items-start p-3 cursor-pointer hover:bg-gray-100 border-b border-gray-100"
    >
      <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
        <MessageCircle className="w-5 h-5 text-gray-500" />
      </div>
      <div className="flex-1 ml-3 overflow-hidden">
        <p className="font-semibold text-sm text-gray-800 truncate">
          {item.title}
        </p>
        <p className="text-xs text-gray-600 mt-1 italic break-words">
          "{item.subtitle}"
        </p>
      </div>
    </motion.div>
  );
};

export default SearchResultItem; 