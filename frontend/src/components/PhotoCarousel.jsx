import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PhotoCarousel = ({ photos }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState({});

  useEffect(() => {
    if (photos.length === 0) return;

    // Preload images
    let loadedCount = 0;
    const errors = {};

    photos.forEach((photo, index) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === photos.length) {
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        errors[index] = true;
        loadedCount++;
        if (loadedCount === photos.length) {
          setImagesLoaded(true);
          setImageLoadErrors(errors);
        }
      };
      img.src = photo.url;
    });
  }, [photos]);

  useEffect(() => {
    if (photos.length === 0 || !imagesLoaded) return;

    const interval = setInterval(() => {
      handleNext();
    }, 8000);

    return () => clearInterval(interval);
  }, [currentIndex, photos.length, imagesLoaded]);

  const handleNext = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
      setIsTransitioning(false);
    }, 300);
  };

  const handlePrev = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
      setIsTransitioning(false);
    }, 300);
  };

  const goToSlide = (index) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 300);
  };

  if (!photos || photos.length === 0) {
    return null;
  }

  if (!imagesLoaded) {
    return (
      <div className="carousel-container" data-testid="photo-carousel">
        <div className="carousel-wrapper">
          <div className="carousel-loading">
            <div className="spinner"></div>
            <p>Carregando fotos...</p>
          </div>
        </div>
      </div>
    );
  }

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
          {!imageLoadErrors[currentIndex] ? (
            <img
              src={photos[currentIndex].url}
              alt={photos[currentIndex].caption || 'Foto'}
              className={`carousel-image-element ${isTransitioning ? 'transitioning' : ''}`}
            />
          ) : (
            <div className="carousel-image-error">
              <p>Erro ao carregar imagem</p>
            </div>
          )}
          {photos[currentIndex].caption && (
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

      <div className="carousel-indicators">
        {photos.map((_, index) => (
          <button
            key={index}
            className={`carousel-indicator ${index === currentIndex ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
            data-testid={`carousel-indicator-${index}`}
          />
        ))}
      </div>
    </div>
  );
};

export default PhotoCarousel;