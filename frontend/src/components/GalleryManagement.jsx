import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, getAuthHeaders } from '../App';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';

const GalleryManagement = ({ onBack }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadMethod, setUploadMethod] = useState('file'); // 'file' or 'url'
  const [photoUrl, setPhotoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [adding, setAdding] = useState(false);
  const logoUrl = 'https://customer-assets.emergentagent.com/job_student-meal-tracker/artifacts/s4xj649a_Logo%20Iema%20Pleno%20Mat%C3%B5es_20240308_104933_0000.png';

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/gallery/photos`);
      setPhotos(response.data);
    } catch (error) {
      toast.error('Erro ao carregar fotos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhoto = async () => {
    if (!photoUrl.trim()) {
      toast.error('Insira a URL da foto');
      return;
    }

    setAdding(true);
    try {
      await axios.post(
        `${API}/gallery/photos`,
        { url: photoUrl, caption: caption || null },
        { headers: getAuthHeaders() }
      );
      toast.success('Foto adicionada com sucesso!');
      setPhotoUrl('');
      setCaption('');
      fetchPhotos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao adicionar foto');
    } finally {
      setAdding(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      await axios.delete(`${API}/gallery/photos/${photoId}`, {
        headers: getAuthHeaders()
      });
      toast.success('Foto excluída com sucesso!');
      fetchPhotos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir foto');
    }
  };

  return (
    <div className="dashboard-container" data-testid="gallery-management">
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onBack} className="back-button" data-testid="back-button">
            <ArrowLeft size={20} />
          </button>
          <h1>Gerenciar Mural de Fotos</h1>
        </div>
        <img src={logoUrl} alt="IEMA" style={{ height: '40px' }} />
      </div>

      <div className="dashboard-content">
        <div className="content-card">
          <h2 style={{ marginBottom: '1.5rem' }}>Adicionar Nova Foto</h2>
          <div className="add-photo-form">
            <div className="form-group">
              <label>URL da Foto</label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://exemplo.com/foto.jpg"
                data-testid="photo-url-input"
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  border: '2px solid #B2EBF2',
                  borderRadius: '12px',
                  fontSize: '1rem'
                }}
              />
            </div>
            <div className="form-group">
              <label>Legenda (Opcional)</label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Descrição da foto"
                data-testid="photo-caption-input"
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  border: '2px solid #B2EBF2',
                  borderRadius: '12px',
                  fontSize: '1rem'
                }}
              />
            </div>
            <button
              className="add-photo-button"
              onClick={handleAddPhoto}
              disabled={adding}
              data-testid="add-photo-button"
            >
              <Plus size={20} style={{ marginRight: '0.5rem' }} />
              {adding ? 'Adicionando...' : 'Adicionar Foto'}
            </button>
          </div>
        </div>

        <div className="content-card" style={{ marginTop: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Fotos do Mural ({photos.length})</h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner"></div>
            </div>
          ) : photos.length > 0 ? (
            <div className="gallery-grid">
              {photos.map((photo) => (
                <div key={photo.id} className="gallery-item" data-testid={`gallery-item-${photo.id}`}>
                  <img src={photo.url} alt={photo.caption || 'Foto'} />
                  {photo.caption && (
                    <div className="gallery-caption">{photo.caption}</div>
                  )}
                  <div className="gallery-actions">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="gallery-delete-btn" data-testid={`delete-photo-${photo.id}`}>
                          <Trash2 size={16} />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir esta foto? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeletePhoto(photo.id)}>
                            Sim, Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <ImageIcon size={64} color="#00838F" />
              <p>Nenhuma foto adicionada ao mural ainda</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleryManagement;