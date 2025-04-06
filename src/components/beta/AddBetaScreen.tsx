import React, { useState } from 'react';
        import { ArrowLeft, Video, MessageSquareText, UploadCloud, Loader2 } from 'lucide-react'; // Removed Palette
        import { RouteData, BetaType, ActivityLogDetails } from '../../types';
        import { supabase } from '../../supabaseClient';
        import type { User } from '@supabase/supabase-js';

        interface AddBetaScreenProps {
          currentUser: User | null;
          route: RouteData;
          onBack: () => void;
          onSubmitSuccess: () => void;
        }

        const getGradeColorClass = (colorName: string | undefined): string => {
          if (!colorName) return 'bg-gray-400';
          const colorMap: { [key: string]: string } = {
            'accent-red': 'bg-accent-red', 'accent-blue': 'bg-accent-blue', 'accent-yellow': 'bg-accent-yellow',
            'brand-green': 'bg-brand-green', 'accent-purple': 'bg-accent-purple', 'brand-gray': 'bg-brand-gray',
            'brand-brown': 'bg-brand-brown',
          };
          return colorMap[colorName] || colorMap[colorName.replace('_', '-')] || 'bg-gray-400';
        };

        const BETA_STORAGE_BUCKET = 'route-beta';

        // Define allowed beta types, excluding 'drawing'
        type AllowedBetaType = Exclude<BetaType, 'drawing'>;

        const AddBetaScreen: React.FC<AddBetaScreenProps> = ({ currentUser, route, onBack, onSubmitSuccess }) => {
          const { name, grade, grade_color: gradeColor, id: routeId, gym_id: gymId } = route;
          // Default selected type to 'text'
          const [selectedType, setSelectedType] = useState<AllowedBetaType>('text');
          const [textContent, setTextContent] = useState('');
          const [file, setFile] = useState<File | null>(null);
          const [keyMove, setKeyMove] = useState<string>('');
          const [isSubmitting, setIsSubmitting] = useState(false);
          const [error, setError] = useState<string | null>(null);

          const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            if (event.target.files && event.target.files[0]) {
              const selectedFile = event.target.files[0];
              // Only allow video types now
              const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
              if (selectedType === 'video' && !allowedTypes.includes(selectedFile.type)) {
                setError(`Invalid file type. Please select a video file.`);
                setFile(null); event.target.value = ''; return;
              }
              if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
                setError('File size exceeds 50MB limit.');
                setFile(null); event.target.value = ''; return;
              }
              setError(null); setFile(selectedFile);
            } else { setFile(null); }
          };

          // Function to log activity
          const logActivity = async (details: ActivityLogDetails) => {
            if (!currentUser) return;
            const { error: logError } = await supabase.from('activity_log').insert({
              user_id: currentUser.id, gym_id: gymId, route_id: routeId,
              activity_type: 'add_beta', details: details,
            });
            if (logError) console.error('Error logging add_beta activity:', logError);
            else console.log('add_beta activity logged successfully.');
          };

          const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!currentUser) { setError("You must be logged in to submit beta."); return; }
            setIsSubmitting(true); setError(null);

            if (selectedType === 'text' && !textContent.trim()) { setError('Please enter some text for the tip.'); setIsSubmitting(false); return; }
            if (selectedType === 'video' && !file) { setError(`Please select a video file to upload.`); setIsSubmitting(false); return; }

            try {
              let dataToInsert: any = { route_id: routeId, user_id: currentUser.id, beta_type: selectedType, key_move: keyMove || null };
              let publicUrl: string | null = null;

              if (selectedType === 'video' && file) {
                const fileExt = file.name.split('.').pop();
                const filePath = `${currentUser.id}/${routeId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from(BETA_STORAGE_BUCKET).upload(filePath, file);
                if (uploadError) throw new Error(`Failed to upload video: ${uploadError.message}`);
                const { data: urlData } = supabase.storage.from(BETA_STORAGE_BUCKET).getPublicUrl(filePath);
                if (!urlData?.publicUrl) throw new Error(`Failed to get public URL for the uploaded video.`);
                publicUrl = urlData.publicUrl;
                dataToInsert.content_url = publicUrl;
                dataToInsert.text_content = null;
              } else if (selectedType === 'text') {
                dataToInsert.text_content = textContent.trim();
                dataToInsert.content_url = null;
              }

              const { error: insertError } = await supabase.from('route_beta').insert(dataToInsert);
              if (insertError) throw new Error(`Failed to save beta information: ${insertError.message}`);

              // Log activity after successful beta insertion
              const activityDetails: ActivityLogDetails = {
                route_name: name, route_grade: grade, beta_type: selectedType,
              };
              await logActivity(activityDetails);

              console.log('Beta submitted successfully!');
              onSubmitSuccess();

            } catch (err: any) {
              console.error("Error during beta submission:", err);
              setError(err.message || "An unexpected error occurred during submission.");
            } finally {
              setIsSubmitting(false);
            }
          };

          const renderInputArea = () => {
            switch (selectedType) {
              case 'text': return ( <textarea rows={6} value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Share your beta, sequence tips, or insights..." className="w-full p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue" required /> );
              case 'video': return (
                <div className={`w-full p-4 border-2 border-dashed rounded-lg text-center cursor-pointer ${error && !file ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-accent-blue'}`}>
                  <input type="file" id="fileUpload" accept="video/*" onChange={handleFileChange} className="hidden" required={!file} />
                  <label htmlFor="fileUpload" className="cursor-pointer">
                    <UploadCloud size={40} className="mx-auto text-gray-400 mb-2" />
                    {file ? ( <div> <p className="text-sm font-medium text-brand-gray">{file.name}</p> <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p> <span className="text-accent-blue text-sm underline mt-1 block">Change file</span> </div> ) : ( <p className="text-sm text-brand-gray"> Click to upload a video <span className="text-accent-blue font-medium">(Max 50MB)</span> </p> )}
                  </label>
                </div> );
              default: return null;
            }
          };

          return (
            <div className="min-h-screen bg-gray-100">
              <header className="bg-white shadow-sm p-4 sticky top-0 z-10 flex items-center">
                <button onClick={onBack} className="mr-4 text-brand-gray hover:text-brand-green"> <ArrowLeft size={24} /> </button>
                <div className="flex-grow overflow-hidden">
                   <h1 className="text-xl font-bold text-brand-green truncate">Add Beta For:</h1>
                   <div className="flex items-center text-sm text-gray-500 gap-x-2"> <span className={`font-semibold px-1.5 py-0.5 rounded text-white text-xs ${getGradeColorClass(gradeColor)}`}>{grade}</span> <span className="truncate">{name}</span> </div>
                </div>
              </header>
              <form onSubmit={handleSubmit} className="p-4 space-y-5">
                <section>
                  <label className="block text-sm font-medium text-brand-gray mb-2">Beta Type</label>
                  {/* Updated grid layout for two items */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Map only allowed types */}
                    {(['text', 'video'] as AllowedBetaType[]).map(type => {
                      const Icon = type === 'text' ? MessageSquareText : Video;
                      const label = type.charAt(0).toUpperCase() + type.slice(1);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => { setSelectedType(type); setFile(null); setTextContent(''); setError(null); }}
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
                <section>
                  <label className="block text-sm font-medium text-brand-gray mb-2">
                    {selectedType === 'text' ? 'Your Tip' : 'Upload Video'}
                  </label>
                  {renderInputArea()}
                </section>
                {/* Key Move Section remains unchanged */}
                <section>
                   <label htmlFor="keyMove" className="block text-sm font-medium text-brand-gray mb-1">Applies To (Optional)</label>
                   <div className="relative">
                      <select id="keyMove" value={keyMove} onChange={(e) => setKeyMove(e.target.value)} className="w-full appearance-none bg-white border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue pr-8" >
                         <option value="">General / Whole Route</option>
                         <option value="start">Start Moves</option>
                         <option value="crux">Crux Sequence</option>
                         <option value="middle">Middle Section</option>
                         <option value="topout">Top Out / Finish</option>
                      </select>
                      <svg className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                   </div>
                </section>
                {error && <p className="text-red-500 text-sm text-center bg-red-100 p-2 rounded border border-red-300">{error}</p>}
                <button type="submit" disabled={isSubmitting || !currentUser} className="w-full bg-brand-green hover:bg-opacity-90 text-white font-bold py-3 px-6 rounded-lg transition duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center" >
                  {isSubmitting ? ( <> <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" /> Submitting... </> ) : ( 'Submit Beta' )}
                </button>
                {!currentUser && <p className="text-xs text-center text-red-600 mt-2">You must be logged in to submit beta.</p>}
              </form>
            </div>
          );
        };

        export default AddBetaScreen;
