import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { User, Lock, LogIn, UserPlus, GraduationCap } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('leader');
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  const logoUrl = 'https://customer-assets.emergentagent.com/job_student-meal-tracker/artifacts/s4xj649a_Logo%20Iema%20Pleno%20Mat%C3%B5es_20240308_104933_0000.png';

  useEffect(() => {
    if (isRegister && role === 'leader') {
      fetchAvailableClasses();
    }
  }, [isRegister, role]);

  const fetchAvailableClasses = async () => {
    try {
      const response = await axios.get(`${API}/classes`);
      setClasses(response.data);
    } catch (error) {
      console.error('Erro ao carregar turmas');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password
      });

      const { token, role, username: user, class_id } = response.data;
      onLogin(token, role, user, class_id);
      toast.success('Login realizado com sucesso!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (role === 'leader' && !classId) {
      toast.error('Selecione uma turma');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/auth/register`, {
        username,
        password,
        role,
        class_id: role === 'leader' ? classId : null
      });

      toast.success('Cadastro realizado com sucesso! Faça login para continuar.');
      setIsRegister(false);
      setPassword('');
      setConfirmPassword('');
      setClassId('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar cadastro');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setClassId('');
    setRole('leader');
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    resetForm();
  };

  return (
    <div className="login-container" data-testid="login-container">
      <div className="login-card" style={{ maxWidth: isRegister ? '500px' : '440px' }}>
        <div className="login-header">
          <div className="login-logo">
            <img src={logoUrl} alt="IEMA Pleno Matões" style={{ width: '100%', maxWidth: '200px' }} />
          </div>
          <h1>{isRegister ? 'Criar Conta' : 'Contagem de Alunos'}</h1>
          <p>Sistema de Gerenciamento de Merenda</p>
        </div>

        <form onSubmit={isRegister ? handleRegister : handleLogin}>
          <div className="form-group">
            <label htmlFor="username">Usuário</label>
            <div className="input-wrapper">
              <User className="input-icon" size={20} />
              <input
                id="username"
                type="text"
                data-testid="username-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                id="password"
                type="password"
                data-testid="password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
                minLength={isRegister ? 6 : undefined}
              />
            </div>
          </div>

          {isRegister && (
            <>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmar Senha</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={20} />
                  <input
                    id="confirmPassword"
                    type="password"
                    data-testid="confirm-password-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme sua senha"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="role">Tipo de Usuário</label>
                <div className="input-wrapper">
                  <User className="input-icon" size={20} />
                  <select
                    id="role"
                    data-testid="role-select"
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      setClassId('');
                    }}
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem 0.875rem 3rem',
                      border: '2px solid #B2EBF2',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      background: 'white',
                      color: '#006064',
                      cursor: 'pointer'
                    }}
                    required
                  >
                    <option value="leader">Líder de Turma</option>
                    <option value="admin">Gestão Escolar</option>
                  </select>
                </div>
              </div>

              {role === 'leader' && (
                <div className="form-group">
                  <label htmlFor="class">Turma</label>
                  <div className="input-wrapper">
                    <GraduationCap className="input-icon" size={20} />
                    <select
                      id="class"
                      data-testid="class-select"
                      value={classId}
                      onChange={(e) => setClassId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.875rem 1rem 0.875rem 3rem',
                        border: '2px solid #B2EBF2',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        background: 'white',
                        color: '#006064',
                        cursor: 'pointer'
                      }}
                      required
                    >
                      <option value="">Selecione uma turma</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            className="login-button"
            data-testid={isRegister ? "register-submit-button" : "login-submit-button"}
            disabled={loading}
          >
            {loading ? (isRegister ? 'Cadastrando...' : 'Entrando...') : (isRegister ? 'Criar Conta' : 'Entrar')}
          </button>
        </form>

        <div style={{ 
          textAlign: 'center', 
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #B2EBF2'
        }}>
          <p style={{ color: '#00838F', marginBottom: '0.5rem' }}>
            {isRegister ? 'Já tem uma conta?' : 'Não tem uma conta?'}
          </p>
          <button
            type="button"
            onClick={toggleMode}
            data-testid="toggle-mode-button"
            style={{
              background: 'transparent',
              color: '#00BCD4',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isRegister ? 'Fazer Login' : 'Criar Conta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;