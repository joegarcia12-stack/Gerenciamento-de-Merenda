import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, getAuthHeaders } from '../App';
import { toast } from 'sonner';
import { Users, Send, LogOut, CheckSquare, Square, CheckCircle } from 'lucide-react';

const LeaderDashboard = ({ onLogout }) => {
  const [students, setStudents] = useState([]);
  const [presentIds, setPresentIds] = useState(new Set());
  const [classInfo, setClassInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const username = localStorage.getItem('username');
  const classId = localStorage.getItem('classId');

  const logoUrl = 'https://customer-assets.emergentagent.com/job_student-meal-tracker/artifacts/s4xj649a_Logo%20Iema%20Pleno%20Mat%C3%B5es_20240308_104933_0000.png';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classesRes, studentsRes, attendanceRes] = await Promise.all([
        axios.get(`${API}/classes`, { headers: getAuthHeaders() }),
        axios.get(`${API}/students?class_id=${classId}`, { headers: getAuthHeaders() }),
        axios.get(`${API}/attendance/today?class_id=${classId}`, { headers: getAuthHeaders() })
      ]);

      const myClass = classesRes.data.find(c => c.id === classId);
      setClassInfo(myClass);
      setStudents(studentsRes.data);

      if (attendanceRes.data.present_student_ids?.length > 0) {
        setPresentIds(new Set(attendanceRes.data.present_student_ids));
        setLastUpdate(attendanceRes.data.updated_at);
      }
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (studentId) => {
    setPresentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setPresentIds(new Set(students.map(s => s.id)));
  };

  const deselectAll = () => {
    setPresentIds(new Set());
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/attendance`, {
        class_id: classId,
        present_student_ids: Array.from(presentIds)
      }, { headers: getAuthHeaders() });
      toast.success(`Chamada registrada! ${presentIds.size} aluno(s) presente(s).`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao registrar chamada');
    } finally {
      setSubmitting(false);
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
          <img src={logoUrl} alt="IEMA" style={{ height: '40px', marginRight: '1rem' }} />
          <span className="user-badge" data-testid="username-display">{username}</span>
          <button className="logout-button" onClick={onLogout} data-testid="logout-button">
            <LogOut size={18} style={{ marginRight: '0.5rem', display: 'inline' }} />
            Sair
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Summary Card */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon primary">
                <Users size={24} />
              </div>
              <span className="stat-label">Total de Alunos</span>
            </div>
            <div className="stat-value" data-testid="total-students">{students.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon success">
                <CheckCircle size={24} />
              </div>
              <span className="stat-label">Presentes Hoje</span>
            </div>
            <div className="stat-value" data-testid="present-count">{presentIds.size}</div>
            {lastUpdate && (
              <p style={{ color: '#00838F', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Última atualização: {new Date(lastUpdate).toLocaleTimeString('pt-BR')}
              </p>
            )}
          </div>
        </div>

        {/* Attendance Card */}
        <div className="content-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>Chamada do Dia</h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={selectAll}
                data-testid="select-all-button"
                style={{
                  background: '#E0F7FA',
                  color: '#006064',
                  border: '2px solid #B2EBF2',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s ease'
                }}
              >
                Marcar Todos
              </button>
              <button
                onClick={deselectAll}
                data-testid="deselect-all-button"
                style={{
                  background: 'white',
                  color: '#00838F',
                  border: '2px solid #B2EBF2',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s ease'
                }}
              >
                Desmarcar Todos
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner"></div>
            </div>
          ) : students.length > 0 ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {students.map((student, idx) => {
                  const isPresent = presentIds.has(student.id);
                  return (
                    <div
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      data-testid={`student-row-${student.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.875rem 1rem',
                        background: isPresent ? '#E8F5E9' : 'white',
                        border: `2px solid ${isPresent ? '#81C784' : '#E0E0E0'}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        userSelect: 'none'
                      }}
                    >
                      {isPresent ? (
                        <CheckSquare size={22} color="#4CAF50" />
                      ) : (
                        <Square size={22} color="#BDBDBD" />
                      )}
                      <span style={{
                        fontSize: '0.85rem',
                        color: '#9e9e9e',
                        fontWeight: 500,
                        minWidth: '28px'
                      }}>
                        {idx + 1}.
                      </span>
                      <span style={{
                        fontSize: '1rem',
                        fontWeight: isPresent ? 600 : 400,
                        color: isPresent ? '#2E7D32' : '#424242',
                        flex: 1
                      }}>
                        {student.name}
                      </span>
                      {isPresent && (
                        <span style={{
                          background: '#4CAF50',
                          color: 'white',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          Presente
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                className="submit-button"
                onClick={handleSubmit}
                disabled={submitting}
                data-testid="submit-attendance-button"
                style={{ maxWidth: '400px' }}
              >
                <Send size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
                {submitting ? 'Enviando...' : `Registrar Chamada (${presentIds.size} presente(s))`}
              </button>
            </>
          ) : (
            <div className="empty-state">
              <Users size={48} color="#00838F" style={{ opacity: 0.5 }} />
              <p style={{ marginTop: '1rem' }}>
                Nenhum aluno cadastrado nesta turma.
              </p>
              <p style={{ color: '#00838F', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Solicite ao administrador para cadastrar os alunos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderDashboard;
