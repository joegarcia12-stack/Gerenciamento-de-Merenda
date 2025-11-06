import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, getAuthHeaders } from '../App';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, Users, Shield, UserCircle } from 'lucide-react';
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

const UserManagement = ({ onBack }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const logoUrl = 'https://customer-assets.emergentagent.com/job_student-meal-tracker/artifacts/s4xj649a_Logo%20Iema%20Pleno%20Mat%C3%B5es_20240308_104933_0000.png';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/users`, {
        headers: getAuthHeaders()
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/admin/users/${userId}`, {
        headers: getAuthHeaders()
      });
      toast.success(`Usuário ${username} excluído com sucesso!`);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir usuário');
    } finally {
      setDeleting(false);
    }
  };

  const handleResetAllAccounts = async () => {
    setDeleting(true);
    try {
      const response = await axios.post(`${API}/admin/reset-user-accounts`, {}, {
        headers: getAuthHeaders()
      });
      toast.success(response.data.message);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao resetar contas');
    } finally {
      setDeleting(false);
    }
  };

  const getClassInfo = async (classId) => {
    if (!classId) return null;
    try {
      const response = await axios.get(`${API}/classes`);
      const classInfo = response.data.find(c => c.id === classId);
      return classInfo?.name || 'Turma não encontrada';
    } catch {
      return 'Turma não encontrada';
    }
  };

  const leaderUsers = users.filter(u => u.role === 'leader');
  const adminUsers = users.filter(u => u.role === 'admin');

  return (
    <div className="dashboard-container" data-testid="user-management">
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={onBack}
            className="back-button"
            data-testid="back-button"
          >
            <ArrowLeft size={20} />
          </button>
          <h1>Gerenciamento de Usuários</h1>
        </div>
        <img src={logoUrl} alt="IEMA" style={{ height: '40px' }} />
      </div>

      <div className="dashboard-content">
        <div className="content-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2>Contas Cadastradas</h2>
              <p style={{ color: '#00838F', marginTop: '0.5rem' }}>
                Total: {users.length} usuários ({adminUsers.length} admin, {leaderUsers.length} líderes)
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="reset-button"
                  data-testid="reset-all-users-button"
                  disabled={deleting}
                >
                  <Trash2 size={18} style={{ marginRight: '0.5rem' }} />
                  Resetar Todas as Contas
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Reset de Todas as Contas</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá deletar TODOS os usuários (exceto admins).
                    Os líderes de turma precisarão se cadastrar novamente.
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetAllAccounts}>
                    Sim, Resetar Todas
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              {adminUsers.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#006064', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield size={20} color="#00BCD4" />
                    Administradores
                  </h3>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Usuário</th>
                          <th>ID</th>
                          <th>Tipo</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminUsers.map((user) => (
                          <tr key={user.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Shield size={16} color="#00BCD4" />
                                <strong>{user.username}</strong>
                              </div>
                            </td>
                            <td><code style={{ fontSize: '0.85rem', color: '#00838F' }}>{user.id.substring(0, 8)}...</code></td>
                            <td><span className="shift-badge morning">Admin</span></td>
                            <td>
                              <span style={{ color: '#00838F', fontSize: '0.9rem' }}>Protegido</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {leaderUsers.length > 0 && (
                <div>
                  <h3 style={{ color: '#006064', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <UserCircle size={20} color="#4CAF50" />
                    Líderes de Turma
                  </h3>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Usuário</th>
                          <th>Turma</th>
                          <th>ID</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderUsers.map((user) => {
                          const classInfo = users.length > 0 ? user.class_id : null;
                          return (
                            <tr key={user.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Users size={16} color="#4CAF50" />
                                  <strong>{user.username}</strong>
                                </div>
                              </td>
                              <td>
                                {user.class_id ? (
                                  <ClassNameCell classId={user.class_id} />
                                ) : (
                                  <span style={{ color: '#00838F' }}>Sem turma</span>
                                )}
                              </td>
                              <td><code style={{ fontSize: '0.85rem', color: '#00838F' }}>{user.id.substring(0, 8)}...</code></td>
                              <td>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      className="delete-user-button"
                                      disabled={deleting}
                                      data-testid={`delete-user-${user.id}`}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir o usuário <strong>{user.username}</strong>?
                                        Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteUser(user.id, user.username)}>
                                        Sim, Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {users.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">👥</div>
                  <p>Nenhum usuário cadastrado</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ClassNameCell = ({ classId }) => {
  const [className, setClassName] = useState('Carregando...');

  useEffect(() => {
    const fetchClassName = async () => {
      try {
        const response = await axios.get(`${API}/classes`);
        const classInfo = response.data.find(c => c.id === classId);
        setClassName(classInfo?.name || 'Turma não encontrada');
      } catch {
        setClassName('Erro ao carregar');
      }
    };
    fetchClassName();
  }, [classId]);

  return <span className="shift-badge afternoon">{className}</span>;
};

export default UserManagement;