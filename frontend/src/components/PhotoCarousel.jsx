import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PhotoCarousel = ({ photos }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (photos.length === 0) return;

    const interval = setInterval(() => {
      handleNext();
    }, 8000); // Aumentado de 5s para 8s para reduzir carga

    return () => clearInterval(interval);
  }, [currentIndex, photos.length]);

  const handleNext = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
      setIsTransitioning(false);
    }, 400); // Transição mais rápida
  };

  const handlePrev = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
      setIsTransitioning(false);
    }, 400);
  };

  const goToSlide = (index) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 400);
  };

  if (!photos || photos.length === 0) {
    return null;
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
          <img
            src={photos[currentIndex].url}
            alt={photos[currentIndex].caption || 'Foto'}
            className={`carousel-image-element ${isTransitioning ? 'transitioning' : ''}`}
          />
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