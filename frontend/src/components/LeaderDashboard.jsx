import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, getAuthHeaders } from '../App';
import { toast } from 'sonner';
import { Users, Plus, Minus, Send, LogOut } from 'lucide-react';

const LeaderDashboard = ({ onLogout }) => {
  const [count, setCount] = useState(0);
  const [classInfo, setClassInfo] = useState(null);
  const [todayCount, setTodayCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const username = localStorage.getItem('username');
  const classId = localStorage.getItem('classId');
  
  const logoUrl = 'https://customer-assets.emergentagent.com/job_student-meal-tracker/artifacts/s4xj649a_Logo%20Iema%20Pleno%20Mat%C3%B5es_20240308_104933_0000.png';

  useEffect(() => {
    fetchClassInfo();
    fetchTodayCount();
  }, []);

  const fetchClassInfo = async () => {
    try {
      const response = await axios.get(`${API}/classes`, {
        headers: getAuthHeaders()
      });
      const myClass = response.data.find(c => c.id === classId);
      setClassInfo(myClass);
    } catch (error) {
      toast.error('Erro ao carregar informações da turma');
    }
  };

  const fetchTodayCount = async () => {
    try {
      const response = await axios.get(`${API}/counts/today`, {
        headers: getAuthHeaders()
      });
      const myCount = response.data.find(c => c.class_id === classId);
      if (myCount) {
        setTodayCount(myCount);
        setCount(myCount.count);
      }
    } catch (error) {
      console.error('Erro ao carregar contagem de hoje');
    }
  };

  const handleSubmit = async () => {
    if (count < 0) {
      toast.error('A contagem não pode ser negativa');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API}/counts`,
        {
          class_id: classId,
          count: count
        },
        { headers: getAuthHeaders() }
      );
      toast.success('Contagem registrada com sucesso!');
      fetchTodayCount();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao registrar contagem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container" data-testid="leader-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Painel do Líder</h1>
          {classInfo && (
            <p style={{ color: '#00838F', marginTop: '0.5rem', fontSize: '1.1rem' }}>
              {classInfo.name}
            </p>
          )}
        </div>
        <div className="user-info">
          <span className="user-badge" data-testid="username-display">{username}</span>
          <button
            className="logout-button"
            onClick={onLogout}
            data-testid="logout-button"
          >
            <LogOut size={18} style={{ marginRight: '0.5rem', display: 'inline' }} />
            Sair
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {todayCount && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon success">
                  <Users size={24} />
                </div>
                <span className="stat-label">Contagem Atual</span>
              </div>
              <div className="stat-value" data-testid="current-count-display">{todayCount.count}</div>
              <p style={{ color: '#00838F', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Última atualização: {new Date(todayCount.updated_at).toLocaleTimeString('pt-BR')}
              </p>
            </div>
          </div>
        )}

        <div className="content-card">
          <h2>Registrar Presença de Alunos</h2>
          <p style={{ color: '#00838F', marginBottom: '1.5rem' }}>
            Informe o número de alunos presentes hoje para o controle de merenda.
          </p>

          <div className="count-input-container">
            <div className="count-input-group">
              <button
                className="count-button"
                onClick={() => setCount(Math.max(0, count - 1))}
                data-testid="decrement-button"
                type="button"
              >
                <Minus size={24} />
              </button>
              <input
                type="number"
                className="count-input"
                value={count}
                onChange={(e) => setCount(Math.max(0, parseInt(e.target.value) || 0))}
                data-testid="count-input"
                min="0"
              />
              <button
                className="count-button"
                onClick={() => setCount(count + 1)}
                data-testid="increment-button"
                type="button"
              >
                <Plus size={24} />
              </button>
            </div>

            <button
              className="submit-button"
              onClick={handleSubmit}
              disabled={loading}
              data-testid="submit-count-button"
            >
              <Send size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
              {loading ? 'Enviando...' : 'Registrar Contagem'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderDashboard;