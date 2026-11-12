import React from 'react';
import { MapPin, Building, Layers } from 'lucide-react';

export interface LocationNode {
  id: string;
  name: string;
  code: string;
  path: string;
  building?: string | null;
  floor?: string | null;
  room?: string | null;
}

interface LocationHierarchyTreeProps {
  locations: LocationNode[];
  onSelect?: (location: LocationNode) => void;
  selectedId?: string;
}

export const LocationHierarchyTree: React.FC<LocationHierarchyTreeProps> = ({ locations, onSelect, selectedId }) => {
  return (
    <div className="space-y-1">
      {locations.map((loc) => {
        const isSelected = loc.id === selectedId;

        return (
          <button
            key={loc.id}
            onClick={() => onSelect && onSelect(loc)}
            className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isSelected
                ? 'bg-brand-orange/10 text-brand-orange font-medium'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <MapPin className={`w-4 h-4 shrink-0 ${isSelected ? 'text-brand-orange' : 'text-slate-400'}`} />
            <div className="truncate flex-1">
              <div className="truncate">{loc.name}</div>
              {loc.building && (
                <div className="text-xs text-slate-500 truncate">
                  {loc.building} {loc.floor ? `· Floor ${loc.floor}` : ''} {loc.room ? `· Room ${loc.room}` : ''}
                </div>
              )}
            </div>
            <span className="text-xs font-mono text-slate-500 shrink-0">{loc.code}</span>
          </button>
        );
      })}
    </div>
  );
};
