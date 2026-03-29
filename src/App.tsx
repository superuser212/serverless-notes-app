import { useState, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
// ---------------------------------------------------------
// Types & Configuration
// ---------------------------------------------------------
interface Note {
  id?: string;
  noteId?: string; 
  title: string;
  content: string;
  fileUrl?: string; 
  createdAt?: string;
}

const API_BASE = 'https://wdek58lq0j.execute-api.us-east-2.amazonaws.com';

// ---------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------
// A small helper to turn raw database timestamps into readable dates
const formatTimestamp = (dateString?: string) => {
  if (!dateString) return 'Unknown date';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', 
    hour: 'numeric', minute: '2-digit'
  });
};

// ---------------------------------------------------------
// API Service Functions
// ---------------------------------------------------------

const fetchNotesAPI = async (): Promise<Note[]> => {
  const res = await fetch(`${API_BASE}/notes`);
  if (!res.ok) throw new Error('Failed to fetch notes');
  return res.json();
};

const createNoteAPI = async (title: string, content: string, fileUrl?: string): Promise<Note> => {
  const res = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, fileUrl }), 
  });
  if (!res.ok) throw new Error('Failed to create note');
  return res.json();
};

const deleteNoteAPI = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete note');
};

const getUploadUrlAPI = async (fileName: string, fileType: string): Promise<{ uploadUrl: string; fileUrl: string }> => {
  const res = await fetch(`${API_BASE}/uploads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, contentType: fileType })
  });
  if (!res.ok) throw new Error('Failed to get upload URL');
  
  const data = await res.json();
  return { uploadUrl: data.uploadUrl, fileUrl: data.uploadUrl.split('?')[0] };
};

const uploadFileToS3 = async (uploadUrl: string, file: File): Promise<void> => {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!res.ok) throw new Error('Failed to upload file to S3');
};

// ---------------------------------------------------------
// Main UI Component
// ---------------------------------------------------------

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const data = await fetchNotesAPI();
      
      //Sort notes so the newest ones appear at the top!
      const sortedData = data.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setNotes(sortedData || []);
      setError('');
    } catch (err) {
      setError('Could not connect to the database. Please try again later.'); 
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleCreateNote = async (e: FormEvent) => {
    e.preventDefault();
    
    // Tell the user exactly what they missed instead of silently failing
    if (!title.trim()) {
      setError('Oops! Your note needs a title.');
      return;
    }
    if (!content.trim()) {
      setError('Oops! Your note needs some content.');
      return;
    }

    setLoading(true);
    setError(''); // Clear any previous errors

    try {
      let finalFileUrl = undefined;

      if (file) {
        const { uploadUrl, fileUrl } = await getUploadUrlAPI(file.name, file.type);
        await uploadFileToS3(uploadUrl, file);
        finalFileUrl = fileUrl; 
      }

      await createNoteAPI(title, content, finalFileUrl);

      setTitle('');
      setContent('');
      setFile(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = ''; 

      await loadNotes(); 
    } catch (err: any) {
      // Print the actual error to the console but show a nice message to the user
      console.error("Creation Error:", err);
      setError('Something went wrong while saving your note. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      await deleteNoteAPI(id);
      await loadNotes(); 
    } catch (err) {
      console.error("Deletion Error:", err);
      setError('Could not delete the note. It might have already been removed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Increased the max width slightly so PDFs and images have more breathing room
    <div style={{ maxWidth: '700px', margin: '40px auto', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '0 20px', color: '#202124' }}>
      
      {/* Cleaner header spacing */}
      <h1 style={{ borderBottom: '2px solid #e8eaed', paddingBottom: '16px', marginBottom: '32px' }}>
        Serverless Notes
      </h1>
      
      {error && (
        <div style={{ background: '#fce8e6', color: '#c5221f', padding: '12px 16px', borderRadius: '6px', marginBottom: '24px', fontWeight: '500' }}>
          {error}
        </div>
      )}

      <section style={{ marginBottom: '48px', background: '#f8f9fa', padding: '24px', borderRadius: '12px', border: '1px solid #000000' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '20px' }}>Create a New Note</h2>
        <form onSubmit={handleCreateNote} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <input 
            type="text" 
            placeholder="Note Title" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            style={{ padding: '12px 16px', fontSize: '16px', borderRadius: '6px', border: '1px solid #dadce0', outline: 'none' }}
          />
          <textarea 
            placeholder="Write your thoughts here..." 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            rows={4}
            style={{ padding: '12px 16px', fontSize: '16px', borderRadius: '6px', border: '1px solid #dadce0', resize: 'vertical', outline: 'none' }}
          />
          
          <div style={{ border: '1px dashed #bdc1c6', padding: '16px', borderRadius: '6px', background: 'white' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#5f6368' }}>
              Attach a File (Image or PDF)
            </label>
            <input id="file-upload" type="file" onChange={handleFileChange} accept="image/*, application/pdf" style={{ fontSize: '14px' }} />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              padding: '12px', fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer', 
              background: loading ? '#8ab4f8' : '#1a73e8', color: 'white', 
              border: 'none', borderRadius: '6px', fontWeight: 'bold', marginTop: '8px',
              transition: 'background 0.2s'
            }}>
            {loading ? 'Saving to Cloud...' : 'Save Note'}
          </button>
        </form>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', color: '#5f6368' }}>Your Notes</h2>
        
        {notes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#f8f9fa', borderRadius: '12px', border: '1px dashed #dadce0', color: '#80868b' }}>
            <p style={{ margin: 0, fontSize: '16px' }}>No notes yet. Create your first one above!</p>
          </div>
        ) : null}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {notes.map((note) => {
            const noteId = note.id || note.noteId;
            if (!noteId) return null;

            const isPdf = note.fileUrl?.toLowerCase().includes('.pdf');

            return (
              <div key={noteId} style={{ border: '1px solid #e8eaed', padding: '24px', borderRadius: '12px', background: 'white', boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', color: '#202124', fontSize: '1.25rem' }}>{note.title}</h3>
                    {/* ADDED: Displaying the formatted timestamp right below the title */}
                    {note.createdAt && (
                      <span style={{ fontSize: '12px', color: '#5f6368', display: 'block', marginBottom: '16px' }}>
                        {formatTimestamp(note.createdAt)}
                      </span>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => handleDeleteNote(noteId)} 
                    disabled={loading} 
                    style={{ background: 'transparent', color: '#d93025', border: '1px solid #fce8e6', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  >
                    Delete
                  </button>
                </div>
                
                <p style={{ margin: '0 0 16px 0', color: '#3c4043', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {note.content}
                </p>
                
                {note.fileUrl && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid #f1f3f4', paddingTop: '16px' }}>
                    {isPdf ? (
                      <a href={note.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#f8f9fa', color: '#1a73e8', textDecoration: 'none', borderRadius: '6px', border: '1px solid #dadce0', fontSize: '14px', fontWeight: '500' }}>
                        📄 View Attached PDF
                      </a>
                    ) : (
                      <a href={note.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                        <img 
                          src={note.fileUrl} 
                          alt="Attached file" 
                          style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', border: '1px solid #e8eaed', objectFit: 'contain' }} 
                        />
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}