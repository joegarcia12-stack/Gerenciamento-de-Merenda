import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, getAuthHeaders } from '../App';
import { toast } from 'sonner';
import { ArrowLeft, UserPlus, Trash2, Pencil, Search, Users, X, Check } from 'lucide-react';

const StudentManagement = ({ onBack }) => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) fetchStudents();
  }, [selectedClassId]);

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API}/classes`, { headers: getAuthHeaders() });
      setClasses(res.data);
      if (res.data.length > 0) setSelectedClassId(res.data[0].id);
    } catch {
      toast.error('Erro ao carregar turmas');
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/students?class_id=${selectedClassId}`, { headers: getAuthHeaders() });
      setStudents(res.data);
    } catch {
      toast.error('Erro ao carregar alunos');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    const name = newStudentName.trim();
    if (!name) return;
    setAdding(true);
    try {
      await axios.post(`${API}/students`, { name, class_id: selectedClassId }, { headers: getAuthHeaders() });
      toast.success('Aluno adicionado!');
      setNewStudentName('');
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao adicionar aluno');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/students/${id}`, { headers: getAuthHeaders() });
      toast.success('Aluno removido!');
      fetchStudents();
    } catch {
      toast.error('Erro ao remover aluno');
    }
  };

  const handleEdit = async (id) => {
    const name = editName.trim();
    if (!name) return;
    try {
      await axios.put(`${API}/students/${id}`, { name }, { headers: getAuthHeaders() });
      toast.success('Aluno atualizado!');
      setEditingId(null);
      fetchStudents();
    } catch {
      toast.error('Erro ao atualizar aluno');
    }
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const filtered = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="dashboard-container" data-testid="student-management">
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="back-button" onClick={onBack} data-testid="back-button">
            <ArrowLeft size={20} />
          </button>
          <h1>Cadastro de Alunos</h1>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="content-card">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              data-testid="class-selector"
              style={{
                padding: '0.75rem 1rem',
                border: '2px solid #B2EBF2',
                borderRadius: '12px',
                fontSize: '1rem',
                color: '#006064',
                background: 'white',
                minWidth: '200px'
              }}
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
              <Search size={20} color="#00838F" />
              <input
                type="text"
                placeholder="Buscar aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="search-student"
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  border: '2px solid #B2EBF2',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  color: '#006064'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#E0F7FA', padding: '0.75rem 1rem', borderRadius: '12px' }}>
              <Users size={18} color="#00838F" />
              <span style={{ color: '#006064', fontWeight: 600 }}>{students.length} aluno(s)</span>
            </div>
          </div>

          {/* Add Student Form */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="Nome do aluno"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              data-testid="new-student-name"
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                border: '2px solid #B2EBF2',
                borderRadius: '12px',
                fontSize: '1rem',
                color: '#006064'
              }}
            />
            <button
              className="add-photo-button"
              onClick={handleAdd}
              disabled={adding || !newStudentName.trim()}
              data-testid="add-student-button"
              style={{ whiteSpace: 'nowrap' }}
            >
              <UserPlus size={18} style={{ marginRight: '0.5rem' }} />
              {adding ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>

          {/* Student List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner"></div>
            </div>
          ) : filtered.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Nome do Aluno</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody data-testid="students-table">
                  {filtered.map((student, idx) => (
                    <tr key={student.id}>
                      <td>{idx + 1}</td>
                      <td>
                        {editingId === student.id ? (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleEdit(student.id)}
                              data-testid={`edit-input-${student.id}`}
                              style={{
                                flex: 1,
                                padding: '0.5rem',
                                border: '2px solid #00BCD4',
                                borderRadius: '8px',
                                fontSize: '0.95rem',
                                color: '#006064'
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleEdit(student.id)}
                              style={{ background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', display: 'flex' }}
                              data-testid={`save-edit-${student.id}`}
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
                          <strong>{student.name}</strong>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {editingId !== student.id && (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => { setEditingId(student.id); setEditName(student.name); }}
                              data-testid={`edit-student-${student.id}`}
                              style={{
                                background: 'linear-gradient(135deg, #FFB74D 0%, #FFA726 100%)',
                                color: 'white', border: 'none', borderRadius: '8px',
                                padding: '0.5rem', cursor: 'pointer', display: 'flex'
                              }}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="delete-user-button"
                              onClick={() => handleDelete(student.id)}
                              data-testid={`delete-student-${student.id}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Users size={48} color="#00838F" style={{ opacity: 0.5 }} />
              <p style={{ marginTop: '1rem' }}>
                {searchTerm ? 'Nenhum aluno encontrado' : `Nenhum aluno cadastrado em ${selectedClass?.name || 'esta turma'}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentManagement;
