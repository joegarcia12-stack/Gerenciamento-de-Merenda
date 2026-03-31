# PRD - App de Contagem Diária de Alunos

## Problema Original
Sistema de gerenciamento de merenda escolar que permite Líderes de Turma registrarem a presença de alunos e a Gestão Escolar visualizar dados em tempo real.

## Arquitetura
- **Frontend:** React + Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI (Python) + Motor (async MongoDB)
- **Database:** MongoDB
- **Auth:** JWT-based (admin/leader roles)

## Funcionalidades Implementadas

### Autenticação e Usuários
- [x] Login/Registro com roles (admin, leader)
- [x] JWT authentication
- [x] **Token de cadastro (1012)** — obrigatório para registrar nova conta
- [x] Admin gerencia contas de usuários
- [x] **Admin edita username/senha/turma dos líderes** via interface

### Página Inicial (Pública)
- [x] Mural de fotos (carrossel vertical full-screen)
- [x] Cardápio semanal
- [x] Escala de filas para refeições

### Painel Admin
- [x] Dashboard com resumo de refeições por data
- [x] Gerenciar contas de usuários
- [x] Gerenciar cardápio semanal
- [x] Gerenciar mural de fotos (upload)
- [x] Gerenciar escalas de filas (geração aleatória)
### Cadastro de Alunos (Admin)
- [x] CRUD individual por turma (nome + turma + matrícula + e-mail do responsável)
- [x] **Importação via CSV** - formato `Turma;Nome;Matricula;Email` (separador `;`)
- [x] Tratamento de erros no CSV (turma inválida, linhas incompletas)
- [x] Suporte a encoding UTF-8 e Latin-1
- [x] Busca por nome, matrícula ou e-mail

### Bolsa Família (Admin)
- [x] Tela de monitoramento de frequência escolar
- [x] Filtros: Mensal, Semestral, **Calendário personalizado** (data início/fim), por turma, por aluno (busca)
- [x] Tabela com: nome, turma, matrícula, dias letivos, presenças, faltas, % presença, % falta
- [x] Alerta visual (vermelho) quando falta >= 26%
- [x] Banner resumo com total de alunos em alerta
- [x] Filtro para exibir apenas alunos em alerta
- [x] Envio automático de e-mail ao responsável quando aluno é marcado como presente
- [x] E-mail com template HTML profissional (IEMA Pleno Matões)
- [x] Integração via Gmail SMTP (não-bloqueante com asyncio)
- [x] Remetente: gerenciamentoiema@gmail.com
- [x] Zerar banco de dados

### Painel do Líder
- [x] **Chamada por checklist** - lista de alunos da turma com checkbox
- [x] Marcar/desmarcar todos
- [x] Registrar presença (envia lista de IDs presentes)
- [x] Contagem automática de presentes

### Bug Fixes (Sessão Atual - 30/03/2026)
- [x] Carrossel de fotos: corrigido tela preta ao iniciar (fundo gradiente, preload inteligente)

## Turmas Configuradas
12 turmas: Turma 100 a Turma 303

## Horários das Refeições
- Café da manhã: 09:10 - 09:30
- Almoço: 12:00 - 13:30
- Lanche da tarde: 15:05 - 15:20

## Schema do Banco (MongoDB)
- `users`: id, username, password_hash, role, class_id
- `classes`: id, name
- `students`: id, name, class_id, matricula, email_responsavel
- `attendance`: id, class_id, date, present_student_ids[], count, updated_at, updated_by
- `daily_counts`: id, class_id, date, count, updated_at, updated_by
- `weekly_menus`: id, week_start, monday-friday (dict), updated_at
- `gallery_photos`: id, url, caption, uploaded_at
- `queue_schedules`: id, week_start, schedule (dict), updated_at

## API Endpoints
- POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
- GET /api/classes
- POST/GET/PUT/DELETE /api/students, POST /api/students/bulk, POST /api/students/import-csv
- POST /api/attendance, GET /api/attendance/today
- POST /api/counts, GET /api/counts/today
- GET /api/dashboard/summary
- POST /api/menu/weekly, GET /api/menu/current, GET /api/menu/all
- POST /api/gallery/upload, GET /api/gallery/photos, DELETE /api/gallery/photos/{id}
- POST /api/queue/schedule, GET /api/queue/current

## Backlog / Futuro
- P1: Otimização geral de performance
- P2: Refatoração do server.py (separar em módulos)
- P2: Relatórios de frequência por período
