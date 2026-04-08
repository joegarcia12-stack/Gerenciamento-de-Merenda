import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, getAuthHeaders } from '../App';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, Users, Shield, UserCircle, Pencil, X, Check, Lock, User } from 'lucide-react';
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

const UserManagement = ({ onBack, isMaster }) => {
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editClassId, setEditClassId] = useState('');
  const logoUrl = 'https://customer-assets.emergentagent.com/job_student-meal-tracker/artifacts/s4xj649a_Logo%20Iema%20Pleno%20Mat%C3%B5es_20240308_104933_0000.png';

  useEffect(() => {
    fetchUsers();
    fetchClasses();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/users`, { headers: getAuthHeaders() });
      setUsers(response.data);
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API}/classes`, { headers: getAuthHeaders() });
      setClasses(res.data);
    } catch {}
  };

  const handleDeleteUser = async (userId, username) => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/admin/users/${userId}`, { headers: getAuthHeaders() });
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
      const response = await axios.post(`${API}/admin/reset-user-accounts`, {}, { headers: getAuthHeaders() });
      toast.success(response.data.message);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao resetar contas');
    } finally {
      setDeleting(false);
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditUsername(user.username);
    setEditPassword('');
    setEditClassId(user.class_id || '');
  };

  const handleSaveEdit = async (userId) => {
    const data = {};
    const original = users.find(u => u.id === userId);

    if (editUsername && editUsername !== original?.username) data.username = editUsername;
    if (editPassword) data.password = editPassword;
    if (editClassId !== (original?.class_id || '')) data.class_id = editClassId || null;

    if (Object.keys(data).length === 0) {
      setEditingId(null);
      return;
    }

    try {
      await axios.put(`${API}/admin/users/${userId}`, data, { headers: getAuthHeaders() });
      toast.success('Usuário atualizado com sucesso!');
      setEditingId(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar usuário');
    }
  };

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls?.name || 'Sem turma';
  };

  const leaderUsers = users.filter(u => u.role === 'leader');
  const adminUsers = users.filter(u => u.role === 'admin' || u.role === 'master');

  return (
    <div className="dashboard-container" data-testid="user-management">
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onBack} className="back-button" data-testid="back-button">
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
                <button className="reset-button" data-testid="reset-all-users-button" disabled={deleting}>
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
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetAllAccounts}>Sim, Resetar Todas</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner"></div></div>
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
                                {user.role === 'master' && (
                                  <span style={{ background: '#FFD600', color: '#333', padding: '0.1rem 0.4rem', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700 }}>MASTER</span>
                                )}
                              </div>
                            </td>
                            <td><span className="shift-badge morning">{user.role === 'master' ? 'Master' : 'Admin'}</span></td>
                            <td>
                              {isMaster && user.role !== 'master' ? (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button className="delete-user-button" data-testid={`delete-admin-${user.id}`}>
                                      <Trash2 size={16} />
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir Administrador</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir o administrador <strong>{user.username}</strong>?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteUser(user.id, user.username)}>Sim, Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              ) : (
                                <span style={{ color: '#00838F', fontSize: '0.9rem' }}>Protegido</span>
                              )}
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
                          <th style={{ textAlign: 'center' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderUsers.map((user) => (
                          <tr key={user.id}>
                            <td>
                              {editingId === user.id ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <User size={16} color="#00838F" />
                                    <input
                                      type="text"
                                      value={editUsername}
                                      onChange={(e) => setEditUsername(e.target.value)}
                                      data-testid={`edit-username-${user.id}`}
                                      placeholder="Novo usuário"
                                      style={{
                                        padding: '0.4rem 0.6rem',
                                        border: '2px solid #00BCD4',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        color: '#006064',
                                        width: '150px'
                                      }}
                                    />
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Lock size={16} color="#FF9800" />
                                    <input
                                      type="password"
                                      value={editPassword}
                                      onChange={(e) => setEditPassword(e.target.value)}
                                      data-testid={`edit-password-${user.id}`}
                                      placeholder="Nova senha (opcional)"
                                      style={{
                                        padding: '0.4rem 0.6rem',
                                        border: '2px solid #FFB74D',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        color: '#006064',
                                        width: '150px'
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Users size={16} color="#4CAF50" />
                                  <strong>{user.username}</strong>
                                </div>
                              )}
                            </td>
                            <td>
                              {editingId === user.id ? (
                                <select
                                  value={editClassId}
                                  onChange={(e) => setEditClassId(e.target.value)}
                                  data-testid={`edit-class-${user.id}`}
                                  style={{
                                    padding: '0.4rem 0.6rem',
                                    border: '2px solid #00BCD4',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    color: '#006064',
                                    minWidth: '140px'
                                  }}
                                >
                                  <option value="">Sem turma</option>
                                  {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="shift-badge afternoon">
                                  {user.class_id ? getClassName(user.class_id) : 'Sem turma'}
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {editingId === user.id ? (
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => handleSaveEdit(user.id)}
                                    data-testid={`save-user-${user.id}`}
                                    style={{ background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', display: 'flex' }}
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    style={{ background: '#9e9e9e', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', display: 'flex' }}
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => startEdit(user)}
                                    data-testid={`edit-user-${user.id}`}
                                    style={{
                                      background: 'linear-gradient(135deg, #FFB74D 0%, #FFA726 100%)',
                                      color: 'white', border: 'none', borderRadius: '8px',
                                      padding: '0.5rem', cursor: 'pointer', display: 'flex'
                                    }}
                                  >
                                    <Pencil size={16} />
                                  </button>
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
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {users.length === 0 && (
                <div className="empty-state">
                  <Users size={48} color="#00838F" style={{ opacity: 0.5 }} />
                  <p style={{ marginTop: '1rem' }}>Nenhum usuário cadastrado</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
