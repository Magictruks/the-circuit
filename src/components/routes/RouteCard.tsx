import React from 'react';
import { CheckCircle, Circle, HelpCircle, MapPin, User as SetterIcon, CalendarDays } from 'lucide-react';
import { RouteData } from '../../types';

interface RouteCardProps {
  route: RouteData;
  onClick: () => void; // Add onClick handler prop
}

// Helper to get Tailwind color class from grade_color string (snake_case from DB)
const getGradeColorClass = (colorName: string | undefined): string => {
  if (!colorName) return 'bg-gray-400'; // Default if color is missing
  const colorMap: { [key: string]: string } = {
    'accent-red': 'bg-accent-red', 'accent-blue': 'bg-accent-blue', 'accent-yellow': 'bg-accent-yellow',
    'brand-green': 'bg-brand-green', 'accent-purple': 'bg-accent-purple', 'brand-gray': 'bg-brand-gray',
    'brand-brown': 'bg-brand-brown',
    // Add direct mappings if needed, e.g., 'red': 'bg-accent-red'
  };
  // Try direct lookup first, then check if it matches the key format
  return colorMap[colorName] || (colorMap[colorName.replace('_', '-')] || 'bg-gray-400');
};

const RouteCard: React.FC<RouteCardProps> = ({ route, onClick }) => {
  // Destructure fields directly from the route object, using DB names where applicable
  const { name, grade, grade_color, location, setter, date_set, status, betaAvailable } = route;

  const StatusIcon = () => {
    // Handle optional status
    if (!status) return null;
    switch (status) {
      case 'sent': return <CheckCircle size={18} className="text-green-500" />;
      case 'attempted': return <Circle size={18} className="text-orange-400" />;
      case 'unseen': default: return null; // Don't show icon for unseen
    }
  };

  return (
    <div
      onClick={onClick} // Attach onClick handler
      className="bg-white p-4 rounded-lg shadow border border-gray-200 flex items-center gap-4 hover:shadow-md transition-shadow duration-200 cursor-pointer" // Add cursor-pointer
    >
      {/* Grade Indicator */}
      <div className={`w-12 h-12 ${getGradeColorClass(grade_color)} rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow`}>
        {grade}
      </div>

      {/* Route Details */}
      <div className="flex-grow overflow-hidden">
        <h3 className="text-lg font-semibold text-brand-gray truncate">{name}</h3>
        <div className="flex items-center text-sm text-gray-600 mt-1 gap-x-3 gap-y-1 flex-wrap">
          <span className="flex items-center gap-1"><MapPin size={14} /> {location}</span>
          {setter && <span className="flex items-center gap-1"><SetterIcon size={14} /> {setter}</span>}
          {/* Format date_set */}
          <span className="flex items-center gap-1"><CalendarDays size={14} /> {new Date(date_set).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Status & Beta Icons */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0 ml-auto pl-2">
        <StatusIcon />
        {/* Handle optional betaAvailable */}
        {betaAvailable === true && <HelpCircle size={18} className="text-blue-500" title="Beta Available" />}
      </div>
    </div>
  );
};

export default RouteCard;
