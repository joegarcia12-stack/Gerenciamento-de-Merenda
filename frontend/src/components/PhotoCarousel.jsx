import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PhotoCarousel = ({ photos }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState({});
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Preload current and next images
  useEffect(() => {
    if (!photos || photos.length === 0) return;

    const toPreload = [currentIndex, (currentIndex + 1) % photos.length];
    toPreload.forEach((idx) => {
      if (!loadedImages[idx]) {
        const img = new Image();
        img.onload = () => {
          setLoadedImages((prev) => ({ ...prev, [idx]: true }));
        };
        img.onerror = () => {
          setLoadedImages((prev) => ({ ...prev, [idx]: 'error' }));
        };
        img.src = photos[idx].url;
      }
    });
  }, [photos, currentIndex]);

  useEffect(() => {
    if (!photos || photos.length <= 1) return;

    const interval = setInterval(() => {
      handleNext();
    }, 8000);

    return () => clearInterval(interval);
  }, [currentIndex, photos, handleNext]);

  const handleNext = useCallback(() => {
    if (!photos || photos.length <= 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
      setIsTransitioning(false);
    }, 300);
  }, [photos]);

  const handlePrev = useCallback(() => {
    if (!photos || photos.length <= 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
      setIsTransitioning(false);
    }, 300);
  }, [photos]);

  const goToSlide = useCallback((index) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 300);
  }, []);

  if (!photos || photos.length === 0) return null;

  const currentLoaded = loadedImages[currentIndex] === true;
  const currentError = loadedImages[currentIndex] === 'error';

  return (
    <div className="carousel-container" data-testid="photo-carousel">
      <div className="carousel-wrapper">
        <button
          className="carousel-button carousel-button-left"
          onClick={handlePrev}
          data-testid="carousel-prev"
        >
          <ChevronLeft size={32} />
        </button>

        <div className="carousel-content">
          {currentError ? (
            <div className="carousel-image-error">
              <p>Erro ao carregar imagem</p>
            </div>
          ) : (
            <>
              {!currentLoaded && (
                <div className="carousel-loading">
                  <div className="spinner"></div>
                  <p>Carregando...</p>
                </div>
              )}
              <img
                src={photos[currentIndex].url}
                alt={photos[currentIndex].caption || 'Foto'}
                className={`carousel-image-element ${isTransitioning ? 'transitioning' : ''}`}
                style={{ display: currentLoaded ? 'block' : 'none' }}
                data-testid="carousel-image"
              />
            </>
          )}
          {photos[currentIndex].caption && currentLoaded && (
            <div className="carousel-caption">
              {photos[currentIndex].caption}
            </div>
          )}
        </div>

        <button
          className="carousel-button carousel-button-right"
          onClick={handleNext}
          data-testid="carousel-next"
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {photos.length > 1 && (
        <div className="carousel-indicators">
          {photos.map((photo, index) => (
            <button
              key={photo.id || `indicator-${index}`}
              className={`carousel-indicator ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              data-testid={`carousel-indicator-${index}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoCarousel;
