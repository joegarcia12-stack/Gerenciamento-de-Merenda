import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, getAuthHeaders } from '../App';
import { toast } from 'sonner';
import { Users, Calendar, LogOut, RefreshCw, Trash2, Bell, UserCog, UtensilsCrossed } from 'lucide-react';
import UserManagement from './UserManagement';
import MenuManagement from './MenuManagement';
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

const AdminDashboard = ({ onLogout }) => {
  const [summary, setSummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showNotification, setShowNotification] = useState(true);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showMenuManagement, setShowMenuManagement] = useState(false);
  const username = localStorage.getItem('username');
  
  const logoUrl = 'https://customer-assets.emergentagent.com/job_student-meal-tracker/artifacts/s4xj649a_Logo%20Iema%20Pleno%20Mat%C3%B5es_20240308_104933_0000.png';

  useEffect(() => {
    if (!showUserManagement && !showMenuManagement) {
      fetchSummary();
      checkDailyNotification();
    }
  }, [selectedDate, showUserManagement, showMenuManagement]);

  const checkDailyNotification = () => {
    const today = new Date().toISOString().split('T')[0];
    const lastNotification = localStorage.getItem('lastNotification');
    
    if (lastNotification !== today) {
      setShowNotification(true);
      localStorage.setItem('lastNotification', today);
    }
  };

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

  const handleResetDatabase = async () => {
    setResetting(true);
    try {
      await axios.post(`${API}/admin/reset-database`, {}, {
        headers: getAuthHeaders()
      });
      toast.success('Banco de dados zerado com sucesso!');
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao zerar banco de dados');
    } finally {
      setResetting(false);
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

  if (showUserManagement) {
    return <UserManagement onBack={() => setShowUserManagement(false)} />;
  }

  if (showMenuManagement) {
    return <MenuManagement onBack={() => setShowMenuManagement(false)} />;
  }

  return (
    <div className="dashboard-container" data-testid="admin-dashboard">
      <div className="dashboard-header">
        <h1>Painel de Gestão Escolar</h1>
        <div className="user-info">
          <img src={logoUrl} alt="IEMA" style={{ height: '40px', marginRight: '1rem' }} />
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

      {showNotification && summary && summary.total_classes < 12 && (
        <div className="notification-banner" data-testid="notification-banner">
          <Bell size={20} />
          <span>
            Atenção! {12 - summary.total_classes} turma(s) ainda não registraram a contagem de hoje.
          </span>
          <button onClick={() => setShowNotification(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1.5rem' }}>
            ×
          </button>
        </div>
      )}

      <div className="dashboard-content">
        <div className="content-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2>Resumo de Refeições</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
              
              <button
                className="manage-users-button"
                onClick={() => setShowUserManagement(true)}
                data-testid="manage-users-button"
              >
                <UserCog size={18} style={{ marginRight: '0.5rem' }} />
                Gerenciar Contas
              </button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="reset-button"
                    data-testid="reset-database-button"
                    disabled={resetting}
                  >
                    <Trash2 size={18} style={{ marginRight: '0.5rem' }} />
                    {resetting ? 'Zerando...' : 'Zerar Refeições'}
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Limpeza de Refeições</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá deletar TODAS as contagens de refeições registradas.
                      Os usuários e turmas serão mantidos. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetDatabase}>
                      Sim, Zerar Refeições
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                      <Users size={24} />
                    </div>
                    <span className="stat-label">Turmas Registradas</span>
                  </div>
                  <div className="stat-value" data-testid="total-classes">{summary.total_classes}</div>
                  <p style={{ color: '#00838F', fontSize: '0.9rem', marginTop: '0.5rem' }}>de 12 turmas</p>
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Turma</th>
                      <th>Alunos Presentes</th>
                      <th>Última Atualização</th>
                    </tr>
                  </thead>
                  <tbody data-testid="classes-table">
                    {summary.class_details.map((detail) => (
                      <tr key={detail.id}>
                        <td><strong>{detail.class_name}</strong></td>
                        <td>
                          <strong style={{ fontSize: '1.2rem', color: '#006064' }}>
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