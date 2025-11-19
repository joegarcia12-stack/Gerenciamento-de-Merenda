import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, getAuthHeaders } from '../App';
import { toast } from 'sonner';
import { ArrowLeft, Save, Calendar, Users, RotateCw } from 'lucide-react';

const QueueManagement = ({ onBack }) => {
  const [weekStart, setWeekStart] = useState('');
  const [classes, setClasses] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(false);
  const logoUrl = 'https://customer-assets.emergentagent.com/job_student-meal-tracker/artifacts/s4xj649a_Logo%20Iema%20Pleno%20Mat%C3%B5es_20240308_104933_0000.png';

  const days = [
    { key: 'monday', label: 'Segunda' },
    { key: 'tuesday', label: 'Terça' },
    { key: 'wednesday', label: 'Quarta' },
    { key: 'thursday', label: 'Quinta' },
    { key: 'friday', label: 'Sexta' }
  ];

  const meals = [
    { key: 'breakfast', label: 'Café da Manhã', time: '7:00 - 8:00' },
    { key: 'lunch', label: 'Almoço', time: '11:30 - 13:00' },
    { key: 'snack', label: 'Lanche', time: '15:00 - 16:00' }
  ];

  useEffect(() => {
    fetchClasses();
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    const mondayStr = monday.toISOString().split('T')[0];
    setWeekStart(mondayStr);
    loadExistingSchedule(mondayStr);
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API}/classes`);
      setClasses(response.data);
    } catch (error) {
      toast.error('Erro ao carregar turmas');
    }
  };

  const loadExistingSchedule = async (weekStartDate) => {
    try {
      const response = await axios.get(`${API}/queue/by-week/${weekStartDate}`, {
        headers: getAuthHeaders()
      });
      if (response.data && response.data.schedule) {
        setSchedule(response.data.schedule);
        toast.success('Escala carregada com sucesso!');
      } else {
        generateDefaultSchedule();
      }
    } catch (error) {
      generateDefaultSchedule();
    }
  };

  const generateDefaultSchedule = () => {
    const newSchedule = {};
    days.forEach((day) => {
      newSchedule[day.key] = {
        queue1: { breakfast: [], lunch: [], snack: [] },
        queue2: { breakfast: [], lunch: [], snack: [] }
      };
    });
    setSchedule(newSchedule);
  };

  const distributeClassesRandomly = () => {
    if (classes.length === 0) return;

    const newSchedule = {};

    days.forEach((day) => {
      // Shuffle classes randomly for each day
      const shuffledClasses = [...classes].sort(() => Math.random() - 0.5);
      
      newSchedule[day.key] = {
        queue1: { breakfast: [], lunch: [], snack: [] },
        queue2: { breakfast: [], lunch: [], snack: [] }
      };

      // First 6 classes go to queue1
      for (let i = 0; i < 6 && i < shuffledClasses.length; i++) {
        newSchedule[day.key].queue1.breakfast.push(shuffledClasses[i].name);
        newSchedule[day.key].queue1.lunch.push(shuffledClasses[i].name);
        newSchedule[day.key].queue1.snack.push(shuffledClasses[i].name);
      }

      // Next 6 classes go to queue2
      for (let i = 6; i < 12 && i < shuffledClasses.length; i++) {
        newSchedule[day.key].queue2.breakfast.push(shuffledClasses[i].name);
        newSchedule[day.key].queue2.lunch.push(shuffledClasses[i].name);
        newSchedule[day.key].queue2.snack.push(shuffledClasses[i].name);
      }
    });

    setSchedule(newSchedule);
    toast.success('Escala gerada aleatoriamente! A ordem muda a cada dia.');
  };

  const handleSave = async () => {
    if (!weekStart) {
      toast.error('Selecione a data de início da semana');
      return;
    }

    // Validar se há turmas nas filas
    const hasClasses = Object.values(schedule).some(day => 
      day.queue1.breakfast.length > 0 || day.queue2.breakfast.length > 0
    );

    if (!hasClasses) {
      toast.error('Gere a escala antes de salvar');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API}/queue/schedule`,
        { week_start: weekStart, schedule },
        { headers: getAuthHeaders() }
      );
      toast.success('✅ Escala salva e publicada na página inicial!', {
        duration: 3000,
        style: {
          background: '#4CAF50',
          color: 'white',
        }
      });
      setTimeout(() => onBack(), 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar escala');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container" data-testid="queue-management">
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onBack} className="back-button" data-testid="back-button">
            <ArrowLeft size={20} />
          </button>
          <h1>Gerenciar Filas de Refeições</h1>
        </div>
        <img src={logoUrl} alt="IEMA" style={{ height: '40px' }} />
      </div>

      <div className="dashboard-content">
        <div className="content-card">
          <div className="info-banner">
            <div style={{ fontSize: '1.5rem' }}>🎲</div>
            <div>
              <strong>Sistema de Distribuição Aleatória</strong>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#00838F' }}>
                Ao clicar em "Gerar Aleatoriamente", as 12 turmas serão distribuídas de forma aleatória nas duas filas.
                Cada dia terá uma combinação diferente. Após salvar, a escala será publicada automaticamente na página inicial.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
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
                    loadExistingSchedule(e.target.value);
                  }}
                  data-testid="week-start-input"
                  style={{ maxWidth: '250px' }}
                />
                <Calendar size={20} color="#00BCD4" />
              </div>
            </div>
            <button
              className="auto-generate-button"
              onClick={distributeClassesRandomly}
              data-testid="auto-generate-button"
            >
              <RotateCw size={18} style={{ marginRight: '0.5rem' }} />
              Gerar Aleatoriamente
            </button>
          </div>

          <div className="queue-schedule-table">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>1ª FILA</th>
                  <th>2ª FILA</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.key}>
                    <td style={{ fontWeight: 600, background: '#E0F7FA' }}>
                      {day.label}
                    </td>
                    <td>
                      <div className="queue-column">
                        {meals.map((meal) => (
                          <div key={meal.key} className="meal-section">
                            <div className="meal-header">
                              <strong>{meal.label}</strong>
                              <span className="meal-time">{meal.time}</span>
                            </div>
                            <div className="class-list">
                              {schedule[day.key]?.queue1?.[meal.key]?.map((className, idx) => (
                                <span key={idx} className="class-badge">{className}</span>
                              )) || <span style={{ color: '#00838F', fontSize: '0.9rem' }}>Vazio</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="queue-column">
                        {meals.map((meal) => (
                          <div key={meal.key} className="meal-section">
                            <div className="meal-header">
                              <strong>{meal.label}</strong>
                              <span className="meal-time">{meal.time}</span>
                            </div>
                            <div className="class-list">
                              {schedule[day.key]?.queue2?.[meal.key]?.map((className, idx) => (
                                <span key={idx} className="class-badge">{className}</span>
                              )) || <span style={{ color: '#00838F', fontSize: '0.9rem' }}>Vazio</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="save-menu-button"
              onClick={handleSave}
              disabled={loading}
              data-testid="save-queue-button"
            >
              <Save size={20} style={{ marginRight: '0.5rem' }} />
              {loading ? 'Salvando...' : 'Salvar Escala'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueueManagement;
