import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Calendar, Coffee, Utensils, Cookie, LogIn, UserPlus } from 'lucide-react';
import PhotoCarousel from './PhotoCarousel';
import QueueDisplay from './QueueDisplay';

const Home = ({ onShowLogin, onShowRegister }) => {
  const [menu, setMenu] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [queueSchedule, setQueueSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const logoUrl = 'https://customer-assets.emergentagent.com/job_student-meal-tracker/artifacts/s4xj649a_Logo%20Iema%20Pleno%20Mat%C3%B5es_20240308_104933_0000.png';

  useEffect(() => {
    fetchMenu();
    fetchPhotos();
    fetchQueueSchedule();
  }, []);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/menu/current`);
      setMenu(response.data);
    } catch (error) {
      console.error('Erro ao carregar cardápio');
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async () => {
    try {
      const response = await axios.get(`${API}/gallery/photos`);
      setPhotos(response.data);
    } catch (error) {
      console.error('Erro ao carregar fotos');
    }
  };

  const fetchQueueSchedule = async () => {
    try {
      const response = await axios.get(`${API}/queue/current`);
      setQueueSchedule(response.data);
    } catch (error) {
      console.error('Erro ao carregar escala de filas');
    }
  };

  const days = [
    { key: 'monday', label: 'Segunda-feira' },
    { key: 'tuesday', label: 'Terça-feira' },
    { key: 'wednesday', label: 'Quarta-feira' },
    { key: 'thursday', label: 'Quinta-feira' },
    { key: 'friday', label: 'Sexta-feira' }
  ];

  const getMealIcon = (mealType) => {
    switch(mealType) {
      case 'breakfast': return <Coffee size={20} />;
      case 'lunch': return <Utensils size={20} />;
      case 'snack': return <Cookie size={20} />;
      default: return null;
    }
  };

  return (
    <div className="home-container" data-testid="home-page">
      <div className="home-header">
        <div className="home-logo">
          <img src={logoUrl} alt="IEMA Pleno Matões" />
        </div>
        <div className="home-auth-buttons">
          <button className="home-login-btn" onClick={onShowLogin} data-testid="home-login-button">
            <LogIn size={18} />
            Entrar
          </button>
          <button className="home-register-btn" onClick={onShowRegister} data-testid="home-register-button">
            <UserPlus size={18} />
            Cadastrar
          </button>
        </div>
      </div>

      <div className="home-content">
        {photos.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <PhotoCarousel photos={photos} />
          </div>
        )}

        {queueSchedule && (
          <div style={{ marginBottom: '3rem' }}>
            <QueueDisplay schedule={queueSchedule} />
          </div>
        )}

        <div className="home-hero">
          <h1>Cardápio da Semana</h1>
          <p>Confira as refeições programadas para esta semana</p>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando cardápio...</p>
          </div>
        ) : menu ? (
          <div className="menu-grid">
            {days.map((day) => (
              <div key={day.key} className="menu-day-card" data-testid={`menu-${day.key}`}>
                <div className="menu-day-header">
                  <Calendar size={20} />
                  <h3>{day.label}</h3>
                </div>
                <div className="menu-meals">
                  <div className="menu-meal">
                    <div className="menu-meal-label">
                      {getMealIcon('breakfast')}
                      <span>Café da Manhã</span>
                    </div>
                    <p>{menu[day.key]?.breakfast || 'Não definido'}</p>
                  </div>
                  <div className="menu-meal">
                    <div className="menu-meal-label">
                      {getMealIcon('lunch')}
                      <span>Almoço</span>
                    </div>
                    <p>{menu[day.key]?.lunch || 'Não definido'}</p>
                  </div>
                  <div className="menu-meal">
                    <div className="menu-meal-label">
                      {getMealIcon('snack')}
                      <span>Lanche da Tarde</span>
                    </div>
                    <p>{menu[day.key]?.snack || 'Não definido'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-menu-state">
            <Calendar size={64} color="#00838F" />
            <h3>Cardápio não disponível</h3>
            <p>O cardápio desta semana ainda não foi definido pela gestão escolar.</p>
          </div>
        )}
      </div>

      <footer className="home-footer">
        <p>* Cardápio sujeito a alterações</p>
      </footer>
    </div>
  );
};

export default Home;