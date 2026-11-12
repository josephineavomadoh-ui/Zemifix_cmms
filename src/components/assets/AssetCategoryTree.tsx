import React from 'react';
import { Folder, FolderOpen, Tag } from 'lucide-react';

export interface CategoryNode {
  id: string;
  name: string;
  code: string;
  path: string;
  parentId?: string | null;
  description?: string | null;
}

interface AssetCategoryTreeProps {
  categories: CategoryNode[];
  onSelect?: (category: CategoryNode) => void;
  selectedId?: string;
}

export const AssetCategoryTree: React.FC<AssetCategoryTreeProps> = ({ categories, onSelect, selectedId }) => {
  return (
    <div className="space-y-1">
      {categories.map((cat) => {
        const isSelected = cat.id === selectedId;
        const depth = (cat.path.match(/\//g) || []).length - 2;
        const indentClass = depth > 0 ? `pl-${Math.min(depth * 4, 12)}` : '';

        return (
          <button
            key={cat.id}
            onClick={() => onSelect && onSelect(cat)}
            className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${indentClass} ${
              isSelected
                ? 'bg-brand-orange/10 text-brand-orange font-medium'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            {isSelected ? (
              <FolderOpen className="w-4 h-4 text-brand-orange shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span className="truncate">{cat.name}</span>
            <span className="ml-auto text-xs font-mono text-slate-500 shrink-0">{cat.code}</span>
          </button>
        );
      })}
    </div>
  );
};
