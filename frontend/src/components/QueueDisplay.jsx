import React from 'react';
import { Users } from 'lucide-react';

const QueueDisplay = ({ schedule }) => {
  const days = [
    { key: 'monday', label: 'Segunda' },
    { key: 'tuesday', label: 'Terça' },
    { key: 'wednesday', label: 'Quarta' },
    { key: 'thursday', label: 'Quinta' },
    { key: 'friday', label: 'Sexta' }
  ];

  const meals = [
    { key: 'breakfast', label: 'Café', icon: '☕', time: '09:10 - 09:30' },
    { key: 'lunch', label: 'Almoço', icon: '🍽️', time: '12:00 - 13:30' },
    { key: 'snack', label: 'Lanche', icon: '🍪', time: '15:05 - 15:20' }
  ];

  if (!schedule || !schedule.schedule) {
    return null;
  }

  // Get current day
  const today = new Date().getDay();
  const todayKey = today === 0 ? null : days[today - 1]?.key;

  return (
    <div className="queue-display-container" data-testid="queue-display">
      <div className="queue-display-header">
        <Users size={32} color="#006064" />
        <div style={{ flex: 1 }}>
          <h2>Escala de Filas para Refeições</h2>
          <p>Confira a organização das turmas para cada horário de refeição</p>
        </div>
        <div className="queue-info-badge">
          📋 Visualização
        </div>
      </div>

      <div className="queue-display-content">
        <div className="queue-table-wrapper">
          <table className="queue-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Dia</th>
                <th>1ª FILA</th>
                <th>2ª FILA</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.key} className={todayKey === day.key ? 'current-day' : ''}>
                  <td className="day-cell">
                    <div className="day-label">
                      {day.label}
                      {todayKey === day.key && <span className="today-badge">Hoje</span>}
                    </div>
                  </td>
                  <td className="queue-cell">
                    <div className="queue-meals">
                      {meals.map((meal) => (
                        <div key={meal.key} className="meal-row">
                          <div className="meal-info">
                            <span className="meal-icon">{meal.icon}</span>
                            <div>
                              <div className="meal-name">{meal.label}</div>
                              <div className="meal-time">{meal.time}</div>
                            </div>
                          </div>
                          <div className="meal-classes">
                            {schedule.schedule[day.key]?.queue1?.[meal.key]?.map((className, idx) => (
                              <span key={idx} className="queue-class-badge">{className}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="queue-cell">
                    <div className="queue-meals">
                      {meals.map((meal) => (
                        <div key={meal.key} className="meal-row">
                          <div className="meal-info">
                            <span className="meal-icon">{meal.icon}</span>
                            <div>
                              <div className="meal-name">{meal.label}</div>
                              <div className="meal-time">{meal.time}</div>
                            </div>
                          </div>
                          <div className="meal-classes">
                            {schedule.schedule[day.key]?.queue2?.[meal.key]?.map((className, idx) => (
                              <span key={idx} className="queue-class-badge">{className}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QueueDisplay;
