import React from 'react';
    import {
      CheckCircle, Circle, HelpCircle, MessageSquare, FileText, Bookmark,
      MapPin, User as SetterIcon, CalendarDays, Star
    } from 'lucide-react';
    import { RouteData } from '../../types';

    interface RouteCardProps {
      route: RouteData;
      onClick: () => void;
    }

    // Helper to get Tailwind color class from grade_color string (snake_case from DB)
    const getGradeColorClass = (colorName: string | undefined): string => {
      if (!colorName) return 'bg-gray-400'; // Default if color is missing
      const colorMap: { [key: string]: string } = {
        'accent-red': 'bg-accent-red', 'accent-blue': 'bg-accent-blue', 'accent-yellow': 'bg-accent-yellow',
        'brand-green': 'bg-brand-green', 'accent-purple': 'bg-accent-purple', 'brand-gray': 'bg-brand-gray',
        'brand-brown': 'bg-brand-brown',
      };
      return colorMap[colorName] || (colorMap[colorName.replace('_', '-')] || 'bg-gray-400');
    };

    const RouteCard: React.FC<RouteCardProps> = ({ route, onClick }) => {
      // Destructure all relevant fields, including the new status flags
      const {
        name, grade, grade_color, location, setter, date_set,
        status, hasBeta, hasComments, hasNotes, isOnWishlist, rating
      } = route;

      const iconSize = 16; // Consistent icon size
      const iconSpacing = "gap-1.5"; // Spacing between icons

      return (
        <div
          onClick={onClick}
          className="bg-white p-4 rounded-lg shadow border border-gray-200 flex items-center gap-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
        >
          {/* Grade Indicator */}
          <div className={`w-12 h-12 ${getGradeColorClass(grade_color)} rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow`}>
            {grade}
          </div>

          {/* Route Details */}
          <div className="flex-grow overflow-hidden">
            <div className={`flex flex-row gap-x-2`}>
							<h3 className="text-lg font-semibold text-brand-gray truncate">{name}</h3>
							<div className={`flex flex-row items-center align-center ${iconSpacing}`}>
										{/* Row 2: Additional Info Icons */}
										<div className={`flex ${iconSpacing} h-5`}>
											{isOnWishlist && <Bookmark size={iconSize} className="text-accent-yellow" fill="currentColor" title="On Wishlist" />}
											{rating && <Star size={iconSize} className={ 'text-accent-yellow'} fill={'currentColor'} />}
											
										</div>
							</div>
						</div>
            <div className="flex items-center text-sm text-gray-600 mt-1 gap-x-3 gap-y-1 flex-wrap">
              <span className="flex items-center gap-1"><MapPin size={14} /> {location}</span>
              {setter && <span className="flex items-center gap-1"><SetterIcon size={14} /> {setter}</span>}
              <span className="flex items-center gap-1"><CalendarDays size={14} /> {new Date(date_set).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>

          {/* Status & Info Icons */}
          <div className={`flex flex-row items-end ${iconSpacing} flex-shrink-0 ml-auto pl-2`}>


            {/* Row 2: Additional Info Icons */}
            <div className={`flex ${iconSpacing} h-5`}> {/* Reserve space */}
              {hasBeta && <HelpCircle size={iconSize} className="text-blue-500" title="Beta Available" />}
              {hasComments && <MessageSquare size={iconSize} className="text-indigo-500" title="Comments Available" />}
              {/* {hasNotes && <FileText size={iconSize} className="text-purple-500" title="You have notes" />} */}
              {/* {isOnWishlist && <Bookmark size={iconSize} className="text-accent-yellow" fill="currentColor" title="On Wishlist" />} */}
            </div>

						{/* Row 1: Progress Status */}
            <div className="h-5"> {/* Reserve space even if no icon */}
              {status === 'sent' && <CheckCircle size={iconSize} className="text-green-500" title="Sent" />}
              {status === 'attempted' && <Circle size={iconSize} className="text-orange-400" title="Attempted" />}
            </div>
          </div>
        </div>
      );
    };

    export default RouteCard;
