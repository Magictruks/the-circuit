import React from 'react';
import { CheckCircle, Circle, HelpCircle, MapPin, User as SetterIcon, CalendarDays } from 'lucide-react';
import { RouteData } from '../../types';

interface RouteCardProps {
  route: RouteData;
  onClick: () => void; // Add onClick handler prop
}

// Helper to get Tailwind color class from gradeColor string
const getGradeColorClass = (colorName: string): string => {
  const colorMap: { [key: string]: string } = {
    'accent-red': 'bg-accent-red', 'accent-blue': 'bg-accent-blue', 'accent-yellow': 'bg-accent-yellow',
    'brand-green': 'bg-brand-green', 'accent-purple': 'bg-accent-purple', 'brand-gray': 'bg-brand-gray',
    'brand-brown': 'bg-brand-brown',
  };
  return colorMap[colorName] || 'bg-gray-400';
};

const RouteCard: React.FC<RouteCardProps> = ({ route, onClick }) => {
  const { name, grade, gradeColor, location, setter, dateSet, status, betaAvailable } = route;

  const StatusIcon = () => {
    switch (status) {
      case 'sent': return <CheckCircle size={18} className="text-green-500" />;
      case 'attempted': return <Circle size={18} className="text-orange-400" />;
      case 'unseen': default: return null;
    }
  };

  return (
    <div
      onClick={onClick} // Attach onClick handler
      className="bg-white p-4 rounded-lg shadow border border-gray-200 flex items-center gap-4 hover:shadow-md transition-shadow duration-200 cursor-pointer" // Add cursor-pointer
    >
      {/* Grade Indicator */}
      <div className={`w-12 h-12 ${getGradeColorClass(gradeColor)} rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow`}>
        {grade}
      </div>

      {/* Route Details */}
      <div className="flex-grow overflow-hidden">
        <h3 className="text-lg font-semibold text-brand-gray truncate">{name}</h3>
        <div className="flex items-center text-sm text-gray-600 mt-1 gap-x-3 gap-y-1 flex-wrap">
          <span className="flex items-center gap-1"><MapPin size={14} /> {location}</span>
          {setter && <span className="flex items-center gap-1"><SetterIcon size={14} /> {setter}</span>}
          <span className="flex items-center gap-1"><CalendarDays size={14} /> {new Date(dateSet).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Status & Beta Icons */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0 ml-auto pl-2">
        <StatusIcon />
        {betaAvailable && <HelpCircle size={18} className="text-blue-500" title="Beta Available" />}
      </div>
    </div>
  );
};

export default RouteCard;
