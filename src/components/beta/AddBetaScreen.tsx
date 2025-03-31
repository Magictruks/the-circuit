import React, { useState } from 'react';
import { ArrowLeft, Video, MessageSquareText, Image as ImageIcon, Palette, ChevronDown, UploadCloud } from 'lucide-react';
import { RouteData, BetaType } from '../../types';

interface AddBetaScreenProps {
  route: RouteData;
  onBack: () => void;
  onSubmitSuccess: () => void; // Callback after successful submission
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

const AddBetaScreen: React.FC<AddBetaScreenProps> = ({ route, onBack, onSubmitSuccess }) => {
  const { name, grade, gradeColor } = route;
  const [selectedType, setSelectedType] = useState<BetaType>('text');
  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [keyMove, setKeyMove] = useState<string>(''); // e.g., 'start', 'crux', 'topout', '' for general
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      // TODO: Add file type/size validation based on selectedType (video/image)
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Basic Validation
    if (selectedType === 'text' && !textContent.trim()) {
      setError('Please enter some text for the tip.');
      setIsSubmitting(false);
      return;
    }
    if ((selectedType === 'video' || selectedType === 'drawing') && !file) {
      setError(`Please select a ${selectedType} file to upload.`);
      setIsSubmitting(false);
      return;
    }

    // --- TODO: Implement Actual Beta Submission Logic ---
    console.log('Submitting Beta:', {
      routeId: route.id,
      type: selectedType,
      text: textContent,
      fileName: file?.name,
      fileSize: file?.size,
      keyMove: keyMove,
    });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // On successful submission:
    console.log('Beta submitted successfully!');
    onSubmitSuccess(); // Navigate back

    // Handle potential API errors here
    // setError("Failed to submit beta. Please try again.");
    // setIsSubmitting(false);
    // --- End TODO ---
  };

  const renderInputArea = () => {
    switch (selectedType) {
      case 'text':
        return (
          <textarea
            rows={6}
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Share your beta, sequence tips, or insights..."
            className="w-full p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue"
            required
          />
        );
      case 'video':
      case 'drawing': // Treat drawing as image upload for now
        return (
          <div className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center bg-gray-50 hover:border-accent-blue cursor-pointer">
            <input
              type="file"
              id="fileUpload"
              accept={selectedType === 'video' ? 'video/*' : 'image/*'} // Accept video or image
              onChange={handleFileChange}
              className="hidden" // Hide default input
              required={!file} // Required if no file is selected yet
            />
            <label htmlFor="fileUpload" className="cursor-pointer">
              <UploadCloud size={40} className="mx-auto text-gray-400 mb-2" />
              {file ? (
                <div>
                  <p className="text-sm font-medium text-brand-gray">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <span className="text-accent-blue text-sm underline mt-1 block">Change file</span>
                </div>
              ) : (
                <p className="text-sm text-brand-gray">
                  Click to upload a {selectedType} <span className="text-accent-blue font-medium">(Max 50MB)</span> {/* Example size limit */}
                </p>
              )}
            </label>
             {/* TODO: Add drawing tool integration if type is 'drawing' */}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10 flex items-center">
        <button onClick={onBack} className="mr-4 text-brand-gray hover:text-brand-green">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-grow overflow-hidden">
           <h1 className="text-xl font-bold text-brand-green truncate">Add Beta For:</h1>
           <div className="flex items-center text-sm text-gray-500 gap-x-2">
             <span className={`font-semibold px-1.5 py-0.5 rounded text-white text-xs ${getGradeColorClass(gradeColor)}`}>{grade}</span>
             <span className="truncate">{name}</span>
           </div>
        </div>
      </header>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-4 space-y-5">
        {/* Beta Type Selection */}
        <section>
          <label className="block text-sm font-medium text-brand-gray mb-2">Beta Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(['text', 'video', 'drawing'] as BetaType[]).map(type => {
              const Icon = type === 'text' ? MessageSquareText : type === 'video' ? Video : Palette; // Palette for drawing
              const label = type.charAt(0).toUpperCase() + type.slice(1);
              return (
                <button
                  key={type}
                  type="button" // Prevent form submission
                  onClick={() => { setSelectedType(type); setFile(null); setTextContent(''); setError(null); }} // Reset other inputs on type change
                  className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-colors ${
                    selectedType === type
                      ? 'bg-accent-blue/10 border-accent-blue text-accent-blue ring-1 ring-accent-blue'
                      : 'bg-white border-gray-300 text-brand-gray hover:bg-gray-50'
                  }`}
                >
                  <Icon size={24} className="mb-1" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Input Area */}
        <section>
           <label className="block text-sm font-medium text-brand-gray mb-2">
             {selectedType === 'text' ? 'Your Tip' : selectedType === 'video' ? 'Upload Video' : 'Upload Photo/Drawing'}
           </label>
           {renderInputArea()}
        </section>

        {/* Optional: Key Move Selection */}
        <section>
           <label htmlFor="keyMove" className="block text-sm font-medium text-brand-gray mb-1">Applies To (Optional)</label>
           <div className="relative">
             <select
               id="keyMove"
               value={keyMove}
               onChange={(e) => setKeyMove(e.target.value)}
               className="w-full appearance-none bg-white border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue pr-8"
             >
               <option value="">General / Whole Route</option>
               <option value="start">Start Moves</option>
               <option value="crux">Crux Sequence</option>
               <option value="middle">Middle Section</option>
               <option value="topout">Top Out / Finish</option>
               {/* Add more specific options if needed */}
             </select>
             <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
           </div>
        </section>

        {/* Error Message */}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-brand-green hover:bg-opacity-90 text-white font-bold py-3 px-6 rounded-lg transition duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSubmitting ? (
             <>
               <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               Submitting...
             </>
          ) : (
             'Submit Beta'
          )}
        </button>
      </form>
    </div>
  );
};

export default AddBetaScreen;
