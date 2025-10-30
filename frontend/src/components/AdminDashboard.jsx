import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, getAuthHeaders } from '../App';
import { toast } from 'sonner';
import { Users, TrendingUp, Calendar, LogOut, RefreshCw } from 'lucide-react';

const AdminDashboard = ({ onLogout }) => {
  const [summary, setSummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const username = localStorage.getItem('username');

  useEffect(() => {
    fetchSummary();
  }, [selectedDate]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/dashboard/summary`, {
        params: { target_date: selectedDate },
        headers: getAuthHeaders()
      });
      setSummary(response.data);
    } catch (error) {
      if (error.response?.status !== 404) {
        toast.error('Erro ao carregar dados do dashboard');
      }
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="dashboard-container" data-testid="admin-dashboard">
      <div className="dashboard-header">
        <h1>Painel de Gestão Escolar</h1>
        <div className="user-info">
          <span className="user-badge" data-testid="admin-username-display">{username}</span>
          <button
            className="logout-button"
            onClick={onLogout}
            data-testid="admin-logout-button"
          >
            <LogOut size={18} style={{ marginRight: '0.5rem', display: 'inline' }} />
            Sair
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="content-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>Resumo de Refeições</h2>
            <div className="date-selector">
              <Calendar size={20} color="#00BCD4" />
              <input
                type="date"
                className="date-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                data-testid="date-selector"
              />
              <button
                className="count-button"
                onClick={fetchSummary}
                data-testid="refresh-button"
                title="Atualizar"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner"></div>
            </div>
          ) : summary && summary.total_meals > 0 ? (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-card-header">
                    <div className="stat-icon primary">
                      <Users size={24} />
                    </div>
                    <span className="stat-label">Total de Refeições</span>
                  </div>
                  <div className="stat-value" data-testid="total-meals">{summary.total_meals}</div>
                  <p style={{ color: '#00838F', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    {formatDate(summary.date)}
                  </p>
                </div>

                <div className="stat-card">
                  <div className="stat-card-header">
                    <div className="stat-icon success">
                      <TrendingUp size={24} />
                    </div>
                    <span className="stat-label">Turmas Registradas</span>
                  </div>
                  <div className="stat-value" data-testid="total-classes">{summary.total_classes}</div>
                  <p style={{ color: '#00838F', fontSize: '0.9rem', marginTop: '0.5rem' }}>de 12 turmas</p>
                </div>

                <div className="stat-card">
                  <div className="stat-card-header">
                    <div className="stat-icon warning">
                      ☀️
                    </div>
                    <span className="stat-label">Turno Manhã</span>
                  </div>
                  <div className="stat-value" data-testid="morning-count">{summary.counts_by_shift.manhã || 0}</div>
                  <p style={{ color: '#00838F', fontSize: '0.9rem', marginTop: '0.5rem' }}>refeições</p>
                </div>

                <div className="stat-card">
                  <div className="stat-card-header">
                    <div className="stat-icon primary">
                      🌙
                    </div>
                    <span className="stat-label">Turno Tarde</span>
                  </div>
                  <div className="stat-value" data-testid="afternoon-count">{summary.counts_by_shift.tarde || 0}</div>
                  <p style={{ color: '#00838F', fontSize: '0.9rem', marginTop: '0.5rem' }}>refeições</p>
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Turma</th>
                      <th>Série</th>
                      <th>Turno</th>
                      <th>Alunos Presentes</th>
                      <th>Última Atualização</th>
                    </tr>
                  </thead>
                  <tbody data-testid="classes-table">
                    {summary.class_details.map((detail) => (
                      <tr key={detail.id}>
                        <td>{detail.class_name}</td>
                        <td>{detail.grade}</td>
                        <td>
                          <span className={`shift-badge ${detail.shift === 'manhã' ? 'morning' : 'afternoon'}`}>
                            {detail.shift === 'manhã' ? '☀️ Manhã' : '🌙 Tarde'}
                          </span>
                        </td>
                        <td>
                          <strong style={{ fontSize: '1.1rem', color: '#006064' }}>
                            {detail.count}
                          </strong>
                        </td>
                        <td>{new Date(detail.updated_at).toLocaleTimeString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>Nenhuma contagem registrada para esta data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;