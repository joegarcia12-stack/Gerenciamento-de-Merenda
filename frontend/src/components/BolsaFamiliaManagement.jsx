import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, getAuthHeaders } from '../App';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle, Search, Users, ShieldAlert, CalendarDays } from 'lucide-react';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '../components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BolsaFamiliaManagement = ({ onBack }) => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [searchTerm, setSearchTerm] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);

  // Calendar state
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [selectedClassId, period, startDate, endDate]);

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API}/classes`, { headers: getAuthHeaders() });
      setClasses(res.data);
    } catch {
      toast.error('Erro ao carregar turmas');
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (selectedClassId) params.append('class_id', selectedClassId);
      if (period === 'custom' && startDate && endDate) {
        params.append('start', formatISO(startDate));
        params.append('end', formatISO(endDate));
      }
      const res = await axios.get(`${API}/attendance/report?${params}`, { headers: getAuthHeaders() });
      setReport(res.data);
    } catch {
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const formatISO = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handlePeriodChange = (p) => {
    setPeriod(p);
    if (p !== 'custom') {
      setStartDate(null);
      setEndDate(null);
    }
  };

  const handleStartSelect = (date) => {
    setStartDate(date);
    setStartOpen(false);
    if (!endDate || date > endDate) {
      setEndDate(date);
    }
    setPeriod('custom');
  };

  const handleEndSelect = (date) => {
    setEndDate(date);
    setEndOpen(false);
    if (!startDate || date < startDate) {
      setStartDate(date);
    }
    setPeriod('custom');
  };

  const filtered = report?.students?.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.matricula && s.matricula.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchAlert = showAlertsOnly ? s.alert : true;
    return matchSearch && matchAlert;
  }) || [];

  const periodLabels = { monthly: 'Mensal', semester: 'Semestral', custom: 'Personalizado' };

  const formatDateBR = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const formatCalendarDisplay = (date) => {
    if (!date) return 'Selecionar data';
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <div className="dashboard-container" data-testid="bolsa-familia">
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="back-button" onClick={onBack} data-testid="back-button">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Bolsa Família</h1>
            <p style={{ color: '#00838F', fontSize: '0.95rem', marginTop: '0.25rem' }}>Monitoramento de frequência escolar</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Alert Summary */}
        {report && report.alert_count > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)',
            border: '1px solid #EF9A9A',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '0.5rem'
          }} data-testid="alert-summary">
            <ShieldAlert size={28} color="#C62828" />
            <div>
              <p style={{ color: '#B71C1C', fontWeight: 700, fontSize: '1.05rem', margin: 0 }}>
                {report.alert_count} aluno(s) com alerta de frequência
              </p>
              <p style={{ color: '#C62828', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
                Estes alunos possuem 26% ou mais de faltas no período selecionado
              </p>
            </div>
          </div>
        )}

        <div className="content-card">
          {/* Period Buttons + Class Filter */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
            {['monthly', 'semester'].map(p => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                data-testid={`period-${p}`}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '10px',
                  border: period === p ? 'none' : '2px solid #B2EBF2',
                  background: period === p ? 'linear-gradient(135deg, #4DD0E1 0%, #00BCD4 100%)' : 'white',
                  color: period === p ? 'white' : '#006064',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s ease'
                }}
              >
                {periodLabels[p]}
              </button>
            ))}

            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              data-testid="class-filter"
              style={{
                padding: '0.6rem 1rem',
                border: '2px solid #B2EBF2',
                borderRadius: '10px',
                fontSize: '0.95rem',
                color: '#006064',
                background: 'white',
                minWidth: '180px'
              }}
            >
              <option value="">Todas as turmas</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <button
              onClick={() => setShowAlertsOnly(!showAlertsOnly)}
              data-testid="alert-filter"
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '10px',
                border: showAlertsOnly ? 'none' : '2px solid #EF9A9A',
                background: showAlertsOnly ? 'linear-gradient(135deg, #EF5350 0%, #E53935 100%)' : 'white',
                color: showAlertsOnly ? 'white' : '#C62828',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease'
              }}
            >
              <AlertTriangle size={16} />
              {showAlertsOnly ? 'Mostrando alertas' : 'Filtrar alertas'}
            </button>
          </div>

          {/* Calendar Date Range Pickers */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1rem',
            alignItems: 'center',
            background: period === 'custom' ? '#E0F7FA' : '#F5F5F5',
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            border: period === 'custom' ? '2px solid #4DD0E1' : '1px solid #E0E0E0',
            transition: 'all 0.3s ease'
          }}>
            <CalendarDays size={20} color="#00838F" />
            <span style={{ color: '#006064', fontWeight: 600, fontSize: '0.9rem' }}>Período:</span>

            {/* Start Date Picker */}
            <Popover open={startOpen} onOpenChange={setStartOpen}>
              <PopoverTrigger asChild>
                <button
                  data-testid="start-date-picker"
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '10px',
                    border: '2px solid #B2EBF2',
                    background: 'white',
                    color: startDate ? '#006064' : '#9e9e9e',
                    fontWeight: startDate ? 600 : 400,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minWidth: '200px'
                  }}
                >
                  <CalendarDays size={16} />
                  {formatCalendarDisplay(startDate)}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" style={{ zIndex: 9999 }}>
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={handleStartSelect}
                  locale={ptBR}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <span style={{ color: '#006064', fontWeight: 500 }}>até</span>

            {/* End Date Picker */}
            <Popover open={endOpen} onOpenChange={setEndOpen}>
              <PopoverTrigger asChild>
                <button
                  data-testid="end-date-picker"
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '10px',
                    border: '2px solid #B2EBF2',
                    background: 'white',
                    color: endDate ? '#006064' : '#9e9e9e',
                    fontWeight: endDate ? 600 : 400,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minWidth: '200px'
                  }}
                >
                  <CalendarDays size={16} />
                  {formatCalendarDisplay(endDate)}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" style={{ zIndex: 9999 }}>
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={handleEndSelect}
                  locale={ptBR}
                  disabled={(date) => date > new Date() || (startDate && date < startDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {period === 'custom' && startDate && endDate && (
              <button
                onClick={() => handlePeriodChange('monthly')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#00838F',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  textDecoration: 'underline'
                }}
              >
                Limpar datas
              </button>
            )}
          </div>

          {/* Search */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '180px' }}>
              <Search size={18} color="#00838F" />
              <input
                type="text"
                placeholder="Buscar aluno ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="search-student"
                style={{
                  flex: 1,
                  padding: '0.6rem 1rem',
                  border: '2px solid #B2EBF2',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  color: '#006064'
                }}
              />
            </div>
          </div>

          {/* Period info */}
          {report && (
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <span style={{
                background: '#E0F7FA',
                color: '#006064',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 500
              }}>
                {formatDateBR(report.start_date)} a {formatDateBR(report.end_date)}
              </span>
              <span style={{
                background: '#E0F7FA',
                color: '#006064',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 500
              }}>
                <Users size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                {filtered.length} aluno(s)
              </span>
              {report.alert_count > 0 && (
                <span style={{
                  background: '#FFEBEE',
                  color: '#C62828',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}>
                  <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  {report.alert_count} alerta(s)
                </span>
              )}
            </div>
          )}

          {/* Table */}
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
                    <th>Aluno</th>
                    <th>Turma</th>
                    <th>Matrícula</th>
                    <th style={{ textAlign: 'center' }}>Dias Letivos</th>
                    <th style={{ textAlign: 'center' }}>Presenças</th>
                    <th style={{ textAlign: 'center' }}>Faltas</th>
                    <th style={{ textAlign: 'center' }}>% Presença</th>
                    <th style={{ textAlign: 'center' }}>% Falta</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody data-testid="report-table">
                  {filtered.map((student, idx) => (
                    <tr key={student.student_id} style={{
                      background: student.alert ? '#FFF3E0' : 'white'
                    }}>
                      <td>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {student.alert && (
                            <AlertTriangle size={16} color="#E65100" style={{ flexShrink: 0 }} />
                          )}
                          <strong style={{ color: student.alert ? '#BF360C' : '#006064' }}>
                            {student.name}
                          </strong>
                        </div>
                      </td>
                      <td>{student.class_name}</td>
                      <td style={{ color: '#00838F' }}>{student.matricula || '—'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{student.total_days}</td>
                      <td style={{ textAlign: 'center', color: '#2E7D32', fontWeight: 600 }}>{student.present_days}</td>
                      <td style={{ textAlign: 'center', color: student.alert ? '#C62828' : '#F57F17', fontWeight: 600 }}>
                        {student.absent_days}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          background: student.presence_pct >= 74 ? '#E8F5E9' : '#FFEBEE',
                          color: student.presence_pct >= 74 ? '#2E7D32' : '#C62828'
                        }}>
                          {student.presence_pct}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          background: student.absence_pct >= 26 ? '#FFEBEE' : '#E8F5E9',
                          color: student.absence_pct >= 26 ? '#C62828' : '#2E7D32'
                        }}>
                          {student.absence_pct}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {student.alert ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.3rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #EF5350 0%, #E53935 100%)',
                            color: 'white'
                          }} data-testid={`alert-badge-${student.student_id}`}>
                            <AlertTriangle size={12} />
                            ALERTA
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-block',
                            padding: '0.3rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            background: '#E8F5E9',
                            color: '#2E7D32'
                          }}>
                            Regular
                          </span>
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
                {searchTerm || showAlertsOnly ? 'Nenhum aluno encontrado com os filtros aplicados' : 'Nenhum dado de frequência disponível para o período selecionado'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BolsaFamiliaManagement;
