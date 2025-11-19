import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, getAuthHeaders } from '../App';
import { toast } from 'sonner';
import { ArrowLeft, Save, Calendar } from 'lucide-react';

const MenuManagement = ({ onBack }) => {
  const [weekStart, setWeekStart] = useState('');
  const [menu, setMenu] = useState({
    monday: { breakfast: '', lunch: '', snack: '' },
    tuesday: { breakfast: '', lunch: '', snack: '' },
    wednesday: { breakfast: '', lunch: '', snack: '' },
    thursday: { breakfast: '', lunch: '', snack: '' },
    friday: { breakfast: '', lunch: '', snack: '' }
  });
  const [loading, setLoading] = useState(false);
  const logoUrl = 'https://customer-assets.emergentagent.com/job_student-meal-tracker/artifacts/s4xj649a_Logo%20Iema%20Pleno%20Mat%C3%B5es_20240308_104933_0000.png';

  useEffect(() => {
    // Set current week Monday
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    setWeekStart(monday.toISOString().split('T')[0]);
    loadExistingMenu(monday.toISOString().split('T')[0]);
  }, []);

  const loadExistingMenu = async (weekStartDate) => {
    try {
      const response = await axios.get(`${API}/menu/current`, {
        headers: getAuthHeaders()
      });
      if (response.data && response.data.week_start === weekStartDate) {
        setMenu({
          monday: response.data.monday,
          tuesday: response.data.tuesday,
          wednesday: response.data.wednesday,
          thursday: response.data.thursday,
          friday: response.data.friday
        });
      }
    } catch (error) {
      console.log('Nenhum cardápio existente encontrado');
    }
  };

  const handleMealChange = (day, mealType, value) => {
    setMenu(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!weekStart) {
      toast.error('Selecione a data de início da semana');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API}/menu/weekly`,
        {
          week_start: weekStart,
          ...menu
        },
        { headers: getAuthHeaders() }
      );
      toast.success('Cardápio salvo com sucesso!');
      setTimeout(() => onBack(), 1500);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar cardápio');
    } finally {
      setLoading(false);
    }
  };

  const days = [
    { key: 'monday', label: 'Segunda-feira' },
    { key: 'tuesday', label: 'Terça-feira' },
    { key: 'wednesday', label: 'Quarta-feira' },
    { key: 'thursday', label: 'Quinta-feira' },
    { key: 'friday', label: 'Sexta-feira' }
  ];

  return (
    <div className="dashboard-container" data-testid="menu-management">
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onBack} className="back-button" data-testid="back-button">
            <ArrowLeft size={20} />
          </button>
          <h1>Gerenciar Cardápio Semanal</h1>
        </div>
        <img src={logoUrl} alt="IEMA" style={{ height: '40px' }} />
      </div>

      <div className="dashboard-content">
        <div className="content-card">
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#006064' }}>
              Semana Inicial (Segunda-feira)
            </label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input
                type="date"
                className="date-input"
                value={weekStart}
                onChange={(e) => {
                  setWeekStart(e.target.value);
                  loadExistingMenu(e.target.value);
                }}
                data-testid="week-start-input"
                style={{ maxWidth: '250px' }}
              />
              <Calendar size={20} color="#00BCD4" />
            </div>
          </div>

          <div className="menu-edit-grid">
            {days.map((day) => (
              <div key={day.key} className="menu-edit-card">
                <h3 style={{ color: '#006064', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>
                  {day.label}
                </h3>
                <div className="menu-edit-fields">
                  <div className="form-group">
                    <label>☕ Café da Manhã</label>
                    <textarea
                      value={menu[day.key].breakfast}
                      onChange={(e) => handleMealChange(day.key, 'breakfast', e.target.value)}
                      data-testid={`${day.key}-breakfast`}
                      placeholder="Ex: Pão com manteiga, café com leite, fruta"
                      rows={2}
                    />
                  </div>
                  <div className="form-group">
                    <label>🍽️ Almoço</label>
                    <textarea
                      value={menu[day.key].lunch}
                      onChange={(e) => handleMealChange(day.key, 'lunch', e.target.value)}
                      data-testid={`${day.key}-lunch`}
                      placeholder="Ex: Arroz, feijão, frango, salada"
                      rows={2}
                    />
                  </div>
                  <div className="form-group">
                    <label>🍪 Lanche da Tarde</label>
                    <textarea
                      value={menu[day.key].snack}
                      onChange={(e) => handleMealChange(day.key, 'snack', e.target.value)}
                      data-testid={`${day.key}-snack`}
                      placeholder="Ex: Suco, biscoitos, fruta"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="save-menu-button"
              onClick={handleSave}
              disabled={loading}
              data-testid="save-menu-button"
            >
              <Save size={20} style={{ marginRight: '0.5rem' }} />
              {loading ? 'Salvando...' : 'Salvar Cardápio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuManagement;