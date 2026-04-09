import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API, getAuthHeaders } from '../App';
import { toast } from 'sonner';
import { Users, Calendar, LogOut, RefreshCw, Trash2, Bell, UserCog, UtensilsCrossed, Images, ListOrdered, GraduationCap, ShieldAlert, Lock } from 'lucide-react';
import UserManagement from './UserManagement';
import MenuManagement from './MenuManagement';
import GalleryManagement from './GalleryManagement';
import QueueManagement from './QueueManagement';
import StudentManagement from './StudentManagement';
import BolsaFamiliaManagement from './BolsaFamiliaManagement';
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

const AdminDashboard = ({ onLogout, userRole }) => {
  const isMaster = userRole === 'master';
  const [summary, setSummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showNotification, setShowNotification] = useState(true);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showMenuManagement, setShowMenuManagement] = useState(false);
  const [showGalleryManagement, setShowGalleryManagement] = useState(false);
  const [showQueueManagement, setShowQueueManagement] = useState(false);
  const [showStudentManagement, setShowStudentManagement] = useState(false);
  const [showBolsaFamilia, setShowBolsaFamilia] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [currentToken, setCurrentToken] = useState('');
  const [newToken, setNewToken] = useState('');
  const username = localStorage.getItem('username');
  
  const logoUrl = 'https://customer-assets.emergentagent.com/job_student-meal-tracker/artifacts/s4xj649a_Logo%20Iema%20Pleno%20Mat%C3%B5es_20240308_104933_0000.png';

  const checkDailyNotification = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastNotification = localStorage.getItem('lastNotification');
    
    if (lastNotification !== today) {
      setShowNotification(true);
      localStorage.setItem('lastNotification', today);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
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
  }, [selectedDate]);

  useEffect(() => {
    if (!showUserManagement && !showMenuManagement && !showGalleryManagement && !showQueueManagement && !showStudentManagement && !showBolsaFamilia) {
      fetchSummary();
      checkDailyNotification();
    }
  }, [selectedDate, showUserManagement, showMenuManagement, showGalleryManagement, showQueueManagement, showStudentManagement, showBolsaFamilia, fetchSummary, checkDailyNotification]);

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

  const fetchToken = async () => {
    try {
      const res = await axios.get(`${API}/master/token`, { headers: getAuthHeaders() });
      setCurrentToken(res.data.token);
      setNewToken(res.data.token);
      setShowTokenModal(true);
    } catch {
      toast.error('Erro ao buscar token');
    }
  };

  const handleUpdateToken = async () => {
    if (!newToken.trim()) return;
    try {
      await axios.put(`${API}/master/token`, { token: newToken.trim() }, { headers: getAuthHeaders() });
      toast.success('Token de cadastro atualizado!');
      setCurrentToken(newToken.trim());
      setShowTokenModal(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao atualizar token');
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
    return <UserManagement onBack={() => setShowUserManagement(false)} isMaster={isMaster} />;
  }

  if (showMenuManagement) {
    return <MenuManagement onBack={() => setShowMenuManagement(false)} />;
  }

  if (showGalleryManagement) {
    return <GalleryManagement onBack={() => setShowGalleryManagement(false)} />;
  }

  if (showQueueManagement) {
    return <QueueManagement onBack={() => setShowQueueManagement(false)} />;
  }

  if (showStudentManagement) {
    return <StudentManagement onBack={() => setShowStudentManagement(false)} />;
  }

  if (showBolsaFamilia) {
    return <BolsaFamiliaManagement onBack={() => setShowBolsaFamilia(false)} />;
  }

  return (
    <div className="dashboard-container" data-testid="admin-dashboard">
      <div className="dashboard-header">
        <h1>Painel de Gestão Escolar</h1>
        <div className="user-info">
          <img src={logoUrl} alt="IEMA" style={{ height: '40px', marginRight: '1rem' }} />
          <span className="user-badge" data-testid="admin-username-display">
            {isMaster && <span style={{ background: '#FFD600', color: '#333', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, marginRight: '0.5rem' }}>MASTER</span>}
            {username}
          </span>
          {isMaster && (
            <button
              onClick={fetchToken}
              data-testid="manage-token-button"
              style={{
                background: 'linear-gradient(135deg, #FFD600 0%, #FFC107 100%)',
                color: '#333',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Lock size={16} />
              Token
            </button>
          )}
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

              <button
                className="manage-menu-button"
                onClick={() => setShowMenuManagement(true)}
                data-testid="manage-menu-button"
              >
                <UtensilsCrossed size={18} style={{ marginRight: '0.5rem' }} />
                Gerenciar Cardápio
              </button>

              <button
                className="manage-gallery-button"
                onClick={() => setShowGalleryManagement(true)}
                data-testid="manage-gallery-button"
              >
                <Images size={18} style={{ marginRight: '0.5rem' }} />
                Gerenciar Mural
              </button>

              <button
                className="manage-queue-button"
                onClick={() => setShowQueueManagement(true)}
                data-testid="manage-queue-button"
              >
                <ListOrdered size={18} style={{ marginRight: '0.5rem' }} />
                Gerenciar Filas
              </button>

              <button
                className="manage-students-button"
                onClick={() => setShowStudentManagement(true)}
                data-testid="manage-students-button"
              >
                <GraduationCap size={18} style={{ marginRight: '0.5rem' }} />
                Cadastro de Alunos
              </button>

              <button
                className="manage-bolsa-button"
                onClick={() => setShowBolsaFamilia(true)}
                data-testid="manage-bolsa-button"
              >
                <ShieldAlert size={18} style={{ marginRight: '0.5rem' }} />
                Frequência
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

      {/* Token Modal (Master only) */}
      {showTokenModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={() => setShowTokenModal(false)}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '2rem',
            width: '90%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: '#006064', marginBottom: '0.5rem' }}>Alterar Token de Cadastro</h3>
            <p style={{ color: '#00838F', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Token atual: <strong>{currentToken}</strong>
            </p>
            <input
              type="text"
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
              data-testid="new-token-input"
              placeholder="Novo token"
              style={{
                width: '100%', padding: '0.75rem 1rem',
                border: '2px solid #FFD600', borderRadius: '12px',
                fontSize: '1.1rem', color: '#006064', fontWeight: 600,
                textAlign: 'center', letterSpacing: '2px',
                marginBottom: '1.5rem', boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowTokenModal(false)}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '10px',
                  border: '2px solid #E0E0E0', background: 'white',
                  color: '#666', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateToken}
                data-testid="save-token-button"
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '10px',
                  border: 'none', background: 'linear-gradient(135deg, #FFD600 0%, #FFC107 100%)',
                  color: '#333', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Salvar Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;