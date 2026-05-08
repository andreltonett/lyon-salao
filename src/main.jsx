import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  Clock3,
  CreditCard,
  Edit3,
  Eye,
  EyeOff,
  LogOut,
  MessageCircle,
  Plus,
  Settings,
  Star,
  Trash2,
  UserCog,
  UsersRound,
  WalletCards
} from 'lucide-react';
import logo from './assets/logo.png';
import { databaseEnabled, loadFromDatabase, saveToDatabase } from './storage.js';
import './styles.css';

const defaultUsers = [
  {
    id: 1,
    name: 'Andre Admin',
    email: 'admin@salao.com',
    role: 'Administrador',
    password: '123456',
    commissionPercent: 0,
    specialty: ''
  },
  {
    id: 2,
    name: 'Bianca Rocha',
    role: 'Profissional',
    password: '123456',
    commissionPercent: 35,
    specialty: 'Cabeleireira'
  }
];

const defaultAppointments = [];
const defaultClients = [];
const defaultCashRegisters = [];
const defaultSettings = {
  salonName: 'Lyon',
  phone: '',
  bookingLink: '',
  businessHours: ''
};

function loadCollection(key, fallback = []) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function saveCollection(key, value, setter) {
  setter(value);
  localStorage.setItem(key, JSON.stringify(value));
  saveToDatabase(key, value).catch((error) => {
    console.error(error);
  });
}

function loadUsers() {
  return loadCollection('salonflow-users', defaultUsers).map((user) => ({
    ...user,
    commissionPercent: user.commissionPercent ?? (user.role === 'Profissional' ? 35 : 0),
    specialty: user.specialty ?? (user.role === 'Profissional' ? 'Cabeleireira' : '')
  }));
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function clampPercent(value) {
  const number = Number(value || 0);
  return Math.min(Math.max(number, 0), 100);
}

function getToday() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function getCommissionPercent(users, professionalName) {
  const professional = users.find((user) => user.name === professionalName);
  return clampPercent(professional?.commissionPercent);
}

function getAppointmentCommission(users, appointment) {
  return Number(appointment.value || 0) * (getCommissionPercent(users, appointment.pro) / 100);
}

function getCashSummary(appointments, users, date) {
  const dayAppointments = appointments.filter((item) => item.date === date);
  const totalRevenue = dayAppointments.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const commission = dayAppointments.reduce((sum, item) => sum + getAppointmentCommission(users, item), 0);

  return {
    appointments: dayAppointments.length,
    totalRevenue,
    commission,
    salonRevenue: totalRevenue - commission
  };
}

function focusForm(formRef) {
  const form = formRef.current;

  if (!form) return;

  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  form.classList.remove('form-highlight');
  window.setTimeout(() => form.classList.add('form-highlight'), 10);
  window.setTimeout(() => form.classList.remove('form-highlight'), 1300);
  form.querySelector('input, select')?.focus();
}

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <section className="stat-card">
      <div className="stat-icon">
        <Icon size={20} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </section>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function PageHeader({ title, detail, action }) {
  return (
    <header className="page-header">
      <div>
        <span className="eyebrow">{detail}</span>
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  );
}

function LoginScreen({ users, onLogin }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const normalizedLogin = login.trim().toLowerCase();
    const foundUser = users.find((user) => (
      user.password === password
      && [user.email, user.name].filter(Boolean).some((value) => value.toLowerCase() === normalizedLogin)
    ));

    if (!foundUser) {
      setError('Usuario ou senha incorretos.');
      return;
    }

    setError('');
    onLogin(foundUser);
  }

  return (
    <main className="login-screen">
      <section className="login-brand">
        <img className="login-logo" src={logo} alt="Lyon Cabeleireiros" />
        <span className="eyebrow">Lyon</span>
        <h1>Sistema de gestão do salão.</h1>
        <p>Acesse agenda, clientes, usuários, caixa, financeiro e configurações.</p>
      </section>

      <section className="login-card">
        <div>
          <span className="eyebrow">Acesso seguro</span>
          <h2>Entrar no sistema</h2>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Usuário
            <input value={login} onChange={(event) => setLogin(event.target.value)} required />
          </label>
          <label>
            Senha
            <div className="password-field">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                required
              />
              <button type="button" aria-label="Mostrar senha" onClick={() => setShowPassword((current) => !current)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button login-button" type="submit">Acessar sistema</button>
        </form>
      </section>
    </main>
  );
}

function UsersPanel({ users, setUsers }) {
  const emptyForm = { name: '', email: '', role: 'Profissional', password: '', commissionPercent: 35, specialty: 'Manicure' };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [roleFilter, setRoleFilter] = useState('Todos');
  const formRef = useRef(null);

  const selectedUser = useMemo(() => users.find((user) => user.id === editingId), [editingId, users]);
  const visibleUsers = useMemo(() => (
    [...users]
      .filter((user) => roleFilter === 'Todos' || user.role === roleFilter)
      .sort((firstUser, secondUser) => firstUser.name.localeCompare(secondUser.name, 'pt-BR'))
  ), [roleFilter, users]);

  function saveUsers(nextUsers) {
    saveCollection('salonflow-users', nextUsers, setUsers);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const normalizedForm = {
      ...form,
      email: form.email.trim(),
      commissionPercent: form.role === 'Profissional' ? clampPercent(form.commissionPercent) : 0,
      specialty: form.role === 'Profissional' ? form.specialty : ''
    };

    if (editingId) {
      saveUsers(users.map((user) => (
        user.id === editingId ? { ...user, ...normalizedForm, password: form.password || user.password } : user
      )));
    } else {
      saveUsers([...users, { ...normalizedForm, id: Date.now() }]);
    }

    setForm(emptyForm);
    setEditingId(null);
  }

  function handleEdit(user) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email || '',
      role: user.role,
      password: '',
      commissionPercent: clampPercent(user.commissionPercent),
      specialty: user.specialty || 'Manicure'
    });
    window.setTimeout(() => focusForm(formRef), 0);
  }

  function handleDelete(userId) {
    saveUsers(users.filter((user) => user.id !== userId));
    if (editingId === userId) {
      setEditingId(null);
      setForm(emptyForm);
    }
  }

  return (
    <section className="panel users-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Usuários</span>
          <h2>Criar, editar e excluir acessos</h2>
        </div>
        <div className="panel-actions">
          {editingId && <span className="editing-pill">Editando {selectedUser?.name}</span>}
          <button className="primary-button" type="button" onClick={() => focusForm(formRef)}>
            <Plus size={18} />
            Novo usuário
          </button>
        </div>
      </div>

      <div className="users-layout">
        <form className="user-form" ref={formRef} onSubmit={handleSubmit}>
          <label>
            Nome
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </label>
          <label>
            Perfil
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option>Administrador</option>
              <option>Gerente</option>
              <option>Profissional</option>
              <option>Recepcao</option>
            </select>
          </label>
          <label>
            E-mail
            <input
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder={form.role === 'Profissional' ? 'Opcional para profissional' : 'Obrigatório para este perfil'}
              type="email"
              required={form.role !== 'Profissional'}
            />
            <small className="field-hint">
              {form.role === 'Profissional' ? 'Profissional pode ficar sem e-mail.' : 'Obrigatório para administrador, gerente e recepção.'}
            </small>
          </label>
          <label>
            Comissão do funcionário (%)
            <input
              inputMode="numeric"
              value={form.commissionPercent}
              onChange={(event) => setForm({ ...form, commissionPercent: event.target.value })}
              disabled={form.role !== 'Profissional'}
              required={form.role === 'Profissional'}
            />
            <small className="field-hint">
              Salão fica com {100 - clampPercent(form.role === 'Profissional' ? form.commissionPercent : 0)}%
            </small>
          </label>
          <label>
            O que faz
            <select
              value={form.specialty}
              onChange={(event) => setForm({ ...form, specialty: event.target.value })}
              disabled={form.role !== 'Profissional'}
              required={form.role === 'Profissional'}
            >
              <option>Manicure</option>
              <option>Cabeleireiro</option>
              <option>Cabeleireira</option>
              <option>Maquiagem</option>
            </select>
          </label>
          <label>
            Senha
            <input
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder={editingId ? 'Deixe em branco para manter' : 'Senha de acesso'}
              type="password"
              required={!editingId}
            />
          </label>
          <div className="form-actions">
            <button className="primary-button" type="submit">
              {editingId ? 'Salvar edição' : 'Criar usuário'}
            </button>
            {editingId && (
              <button className="ghost-button" type="button" onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}>
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="users-list-panel">
          <div className="list-tools">
            <label>
              Filtrar perfil
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option>Todos</option>
                <option>Administrador</option>
                <option>Gerente</option>
                <option>Profissional</option>
                <option>Recepcao</option>
              </select>
            </label>
          </div>

          <div className="users-list">
            {visibleUsers.length > 0 ? visibleUsers.map((user) => (
              <article className="user-row" key={user.id}>
                <div className="avatar">{user.name[0]}</div>
                <div>
                  <strong>{user.name}</strong>
                  <span>{user.email || user.specialty || 'Acesso cadastrado'}</span>
                </div>
                <b>{user.role}</b>
                <span className="commission-tag">
                  Func. {clampPercent(user.commissionPercent)}% / Salão {100 - clampPercent(user.commissionPercent)}%
                </span>
                <div className="row-actions">
                  <button className="icon-button" aria-label={`Editar ${user.name}`} onClick={() => handleEdit(user)}>
                    <Edit3 size={17} />
                  </button>
                  <button className="icon-button danger" aria-label={`Excluir ${user.name}`} onClick={() => handleDelete(user.id)}>
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            )) : (
              <EmptyState title="Nenhum usuário nesse filtro" text="Escolha outro perfil para ver mais usuários." />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AgendaPage({ appointments, clients, users, setAppointments }) {
  const formRef = useRef(null);
  const professionals = users.filter((user) => user.role === 'Profissional');
  const emptyForm = {
    client: clients[0]?.name || '',
    procedure: '',
    value: '',
    pro: professionals[0]?.name || '',
    date: getToday(),
    time: '09:00',
    status: 'Pendente'
  };
  const [form, setForm] = useState(emptyForm);
  const today = getToday();
  const todaysAppointments = appointments.filter((item) => item.date === today);
  const dayRevenue = todaysAppointments.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const dayCommission = todaysAppointments.reduce((sum, item) => sum + getAppointmentCommission(users, item), 0);
  const confirmed = todaysAppointments.filter((item) => item.status === 'Confirmado').length;
  const recurrentClients = clients.filter((client) => Number(client.visits || 0) > 1).length;
  const occupancy = Math.min(Math.round((todaysAppointments.length / 10) * 100), 100);

  function handleSubmit(event) {
    event.preventDefault();
    saveCollection('salonflow-appointments', [
      ...appointments,
      { ...form, id: Date.now(), value: Number(form.value || 0) }
    ], setAppointments);
    setForm({ ...emptyForm, client: form.client, pro: form.pro, date: form.date, time: form.time });
  }

  function handleDelete(appointmentId) {
    saveCollection('salonflow-appointments', appointments.filter((item) => item.id !== appointmentId), setAppointments);
  }

  return (
    <>
      <PageHeader
        title="Agenda"
        detail="Hoje"
        action={<button className="primary-button" type="button" onClick={() => focusForm(formRef)}><Plus size={18} />Novo agendamento</button>}
      />
      <section className="stats-grid">
        <StatCard icon={CalendarDays} label="Atendimentos hoje" value={todaysAppointments.length} detail="Agendamentos para hoje" />
        <StatCard icon={CreditCard} label="Faturamento do dia" value={formatMoney(dayRevenue)} detail="Procedimentos agendados" />
        <StatCard icon={MessageCircle} label="Confirmações" value={`${todaysAppointments.length ? Math.round((confirmed / todaysAppointments.length) * 100) : 0}%`} detail="Horários confirmados" />
        <StatCard icon={Star} label="Clientes recorrentes" value={recurrentClients} detail="Clientes com mais de uma visita" />
      </section>

      <section className="work-grid">
        <div className="panel schedule-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Agenda</span>
              <h2>Próximos horários</h2>
            </div>
          </div>
          <div className="appointment-list">
            {appointments.length > 0 ? appointments.map((item) => (
              <article className="appointment-row" key={item.id}>
                <div className="time">{item.time}</div>
                <div className="appointment-main">
                  <strong>{item.client}</strong>
                  <span>{item.date} - {item.procedure || item.service}</span>
                </div>
                <div className="pro">{item.pro}</div>
                <div className={`status ${item.status === 'Confirmado' ? 'ok' : 'wait'}`}>{item.status}</div>
                <div className="price">{formatMoney(item.value)}</div>
                <button className="icon-button danger" aria-label={`Excluir agendamento de ${item.client}`} onClick={() => handleDelete(item.id)}>
                  <Trash2 size={17} />
                </button>
              </article>
            )) : (
              <EmptyState title="Nenhum agendamento cadastrado" text="Quando houver horários marcados, eles aparecem aqui." />
            )}
          </div>
        </div>

        <div className="panel side-panel">
          <div className="panel-header compact">
            <h2>Capacidade</h2>
            <Clock3 size={20} />
          </div>
          <div className="capacity" style={{ '--occupancy': `${occupancy}%` }}>
            <div>
              <strong>{occupancy}%</strong>
              <span>ocupação de hoje</span>
            </div>
          </div>
          <div className="mini-list">
            <p><Check size={16} />{todaysAppointments.length} horário(s) no dia</p>
            <p><Check size={16} />{todaysAppointments.length - confirmed} cliente(s) aguardando confirmação</p>
            <p><Check size={16} />{formatMoney(dayCommission)} para funcionários</p>
            <p><Check size={16} />{formatMoney(dayRevenue - dayCommission)} fica para o salão</p>
          </div>
        </div>
      </section>

      <section className="panel quick-form-panel">
        <div className="panel-header">
          <h2>Novo agendamento</h2>
          <CalendarDays size={20} />
        </div>
        <form className="quick-form" ref={formRef} onSubmit={handleSubmit}>
          <label>
            Cliente
            <select value={form.client} onChange={(event) => setForm({ ...form, client: event.target.value })} required>
              <option value="">Selecione</option>
              {clients.map((client) => <option key={client.id}>{client.name}</option>)}
            </select>
          </label>
          <label>
            Procedimento
            <input value={form.procedure} onChange={(event) => setForm({ ...form, procedure: event.target.value })} required />
          </label>
          <label>
            Valor
            <input inputMode="numeric" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} required />
          </label>
          <label>
            Profissional
            <select value={form.pro} onChange={(event) => setForm({ ...form, pro: event.target.value })} required>
              <option value="">Selecione</option>
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.name}>{professional.name}</option>
              ))}
            </select>
          </label>
          <label>
            Data
            <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
          </label>
          <label>
            Horário
            <input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} required />
          </label>
          <label>
            Status
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option>Pendente</option>
              <option>Confirmado</option>
            </select>
          </label>
          <button className="primary-button" type="submit">Agendar</button>
        </form>
      </section>
    </>
  );
}

function ClientesPage({ clients, setClients }) {
  const emptyForm = { name: '', phone: '', last: '', visits: 1 };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const formRef = useRef(null);

  function handleSubmit(event) {
    event.preventDefault();
    const normalizedForm = { ...form, visits: Number(form.visits || 0) };
    const nextClients = editingId
      ? clients.map((client) => (client.id === editingId ? { ...client, ...normalizedForm } : client))
      : [...clients, { ...normalizedForm, id: Date.now() }];

    saveCollection('salonflow-clients', nextClients, setClients);
    setForm(emptyForm);
    setEditingId(null);
  }

  function handleEdit(client) {
    setEditingId(client.id);
    setForm({ name: client.name, phone: client.phone, last: client.last, visits: client.visits });
    window.setTimeout(() => focusForm(formRef), 0);
  }

  function handleDelete(clientId) {
    saveCollection('salonflow-clients', clients.filter((client) => client.id !== clientId), setClients);
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        detail="Relacionamento"
        action={<button className="primary-button" type="button" onClick={() => focusForm(formRef)}><Plus size={18} />Novo cliente</button>}
      />
      <div className="management-grid">
        <form className="panel quick-form stacked" ref={formRef} onSubmit={handleSubmit}>
          <div className="panel-header">
            <h2>{editingId ? 'Editar cliente' : 'Cadastrar cliente'}</h2>
            <UsersRound size={20} />
          </div>
          <label>
            Nome
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </label>
          <label>
            Telefone
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
          </label>
          <label>
            Último atendimento
            <input value={form.last} onChange={(event) => setForm({ ...form, last: event.target.value })} />
          </label>
          <label>
            Visitas
            <input inputMode="numeric" value={form.visits} onChange={(event) => setForm({ ...form, visits: event.target.value })} />
          </label>
          <button className="primary-button" type="submit">{editingId ? 'Salvar cliente' : 'Criar cliente'}</button>
          {editingId && (
            <button className="ghost-button" type="button" onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
            }}>
              Cancelar
            </button>
          )}
        </form>

        <div className="panel">
          <div className="panel-header">
            <h2>Clientes recentes</h2>
            <button className="icon-button" aria-label="Adicionar cliente" type="button" onClick={() => focusForm(formRef)}><Plus size={18} /></button>
          </div>
          <div className="table-list">
            {clients.length > 0 ? clients.map((client) => (
              <article className="person-row editable-row" key={client.id}>
                <div className="avatar">{client.name[0]}</div>
                <div>
                  <strong>{client.name}</strong>
                  <span>{client.phone}</span>
                </div>
                <span>{client.last || 'Sem atendimento'}</span>
                <b>{client.visits} visitas</b>
                <div className="row-actions">
                  <button className="icon-button" aria-label={`Editar ${client.name}`} onClick={() => handleEdit(client)}>
                    <Edit3 size={17} />
                  </button>
                  <button className="icon-button danger" aria-label={`Excluir ${client.name}`} onClick={() => handleDelete(client.id)}>
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            )) : (
              <EmptyState title="Nenhum cliente cadastrado" text="A lista ficará vazia até você cadastrar clientes reais." />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function CaixaPage({ appointments, users, cashRegisters, setCashRegisters, loggedUser }) {
  const today = getToday();
  const openRegister = cashRegisters.find((register) => register.status === 'Aberto');
  const todayRegister = cashRegisters.find((register) => register.date === today && register.status === 'Aberto');
  const hasOldOpenRegister = openRegister && openRegister.date !== today;
  const activeDate = openRegister?.date || today;
  const summary = getCashSummary(appointments, users, activeDate);
  const history = [...cashRegisters].sort((firstRegister, secondRegister) => (
    secondRegister.date.localeCompare(firstRegister.date) || secondRegister.id - firstRegister.id
  ));

  function saveCashRegisters(nextRegisters) {
    saveCollection('salonflow-cash-registers', nextRegisters, setCashRegisters);
  }

  function handleOpenCash() {
    if (openRegister) return;
    saveCashRegisters([
      ...cashRegisters,
      {
        id: Date.now(),
        date: today,
        openedAt: new Date().toISOString(),
        openedBy: loggedUser.name,
        status: 'Aberto'
      }
    ]);
  }

  function handleCloseCash(registerId) {
    const registerToClose = cashRegisters.find((register) => register.id === registerId);
    const closeSummary = getCashSummary(appointments, users, registerToClose.date);
    saveCashRegisters(cashRegisters.map((register) => (
      register.id === registerId
        ? { ...register, closedAt: new Date().toISOString(), closedBy: loggedUser.name, status: 'Fechado', summary: closeSummary }
        : register
    )));
  }

  function handleDeleteCash(registerId) {
    saveCashRegisters(cashRegisters.filter((register) => register.id !== registerId));
  }

  return (
    <>
      <PageHeader
        title="Caixa"
        detail="Controle diário"
        action={!openRegister && (
          <button className="primary-button" type="button" onClick={handleOpenCash}>
            <Plus size={18} />
            Abrir caixa de hoje
          </button>
        )}
      />

      {hasOldOpenRegister && (
        <section className="cash-alert">
          <strong>Existe um caixa anterior aberto</strong>
          <span>Feche o caixa de {openRegister.date} antes de abrir o caixa de hoje.</span>
          <button className="primary-button" type="button" onClick={() => handleCloseCash(openRegister.id)}>
            Fechar caixa pendente
          </button>
        </section>
      )}

      <section className="stats-grid finance-page-grid">
        <StatCard icon={CalendarDays} label="Data do caixa" value={activeDate} detail={openRegister ? openRegister.status : 'Nenhum caixa aberto'} />
        <StatCard icon={CreditCard} label="Total bruto" value={formatMoney(summary.totalRevenue)} detail={`${summary.appointments} atendimento(s)`} />
        <StatCard icon={WalletCards} label="Funcionários" value={formatMoney(summary.commission)} detail="Comissões do caixa" />
        <StatCard icon={ChartNoAxesCombined} label="Salão" value={formatMoney(summary.salonRevenue)} detail="Valor que fica no salão" />
      </section>

      <section className="cash-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Status</span>
              <h2>{openRegister ? `Caixa ${openRegister.status.toLowerCase()}` : 'Nenhum caixa aberto'}</h2>
            </div>
            {todayRegister && (
              <button className="primary-button" type="button" onClick={() => handleCloseCash(todayRegister.id)}>
                Fechar caixa
              </button>
            )}
          </div>
          <div className="cash-status">
            {openRegister ? (
              <>
                <p><Check size={16} />Aberto por {openRegister.openedBy}</p>
                <p><Check size={16} />Data do caixa: {openRegister.date}</p>
                <p><Check size={16} />Total atual: {formatMoney(summary.totalRevenue)}</p>
              </>
            ) : (
              <EmptyState title="Caixa fechado" text="Abra o caixa de hoje para iniciar o controle financeiro do dia." />
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Histórico de caixas</h2>
            <WalletCards size={20} />
          </div>
          <div className="cash-history">
            {history.length > 0 ? history.map((register) => {
              const registerSummary = register.summary || getCashSummary(appointments, users, register.date);

              return (
                <article className="cash-row" key={register.id}>
                  <div>
                    <strong>{register.date}</strong>
                    <span>{register.status}</span>
                  </div>
                  <b>{formatMoney(registerSummary.totalRevenue)}</b>
                  <span>Salão {formatMoney(registerSummary.salonRevenue)}</span>
                  {register.status === 'Fechado' && (
                    <button className="icon-button danger" aria-label={`Excluir caixa ${register.date}`} onClick={() => handleDeleteCash(register.id)}>
                      <Trash2 size={17} />
                    </button>
                  )}
                </article>
              );
            }) : (
              <EmptyState title="Nenhum caixa registrado" text="Os caixas abertos e fechados aparecem aqui." />
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function FinanceiroPage({ appointments, users }) {
  const totalRevenue = appointments.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const commission = appointments.reduce((sum, item) => sum + getAppointmentCommission(users, item), 0);
  const salonRevenue = totalRevenue - commission;
  const averageTicket = appointments.length ? totalRevenue / appointments.length : 0;
  const todayRevenue = appointments
    .filter((item) => item.date === getToday())
    .reduce((sum, item) => sum + Number(item.value || 0), 0);

  return (
    <>
      <PageHeader title="Financeiro" detail="Resultados" />
      <section className="stats-grid finance-page-grid">
        <StatCard icon={CreditCard} label="Receita mensal" value={formatMoney(totalRevenue)} detail="Agendamentos cadastrados" />
        <StatCard icon={WalletCards} label="Comissões" value={formatMoney(commission)} detail="Conforme usuários" />
        <StatCard icon={ChartNoAxesCombined} label="Ticket médio" value={formatMoney(averageTicket)} detail="Média por atendimento" />
        <StatCard icon={CalendarDays} label="Receita hoje" value={formatMoney(todayRevenue)} detail="Procedimentos de hoje" />
      </section>
      <div className="panel">
        <div className="panel-header">
          <h2>Resumo financeiro</h2>
          <ChartNoAxesCombined size={20} />
        </div>
        <div className="finance-summary">
          <div>
            <span>Total dos funcionários</span>
            <strong>{formatMoney(commission)}</strong>
          </div>
          <div>
            <span>Fica para o salão</span>
            <strong>{formatMoney(salonRevenue)}</strong>
          </div>
          <div>
            <span>Total bruto</span>
            <strong>{formatMoney(totalRevenue)}</strong>
          </div>
        </div>
      </div>
    </>
  );
}

function ConfigPage({ settings, setSettings, databaseStatus }) {
  const [saved, setSaved] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    saveCollection('salonflow-settings', settings, setSettings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <>
      <PageHeader title="Configurações" detail="Sistema" />
      <section className="panel settings-panel">
        <div className="panel-header">
          <div>
            <h2>Dados do salão</h2>
            <span className="database-status">{databaseStatus}</span>
          </div>
          <Settings size={20} />
        </div>
        <form className="settings-grid" onSubmit={handleSubmit}>
          <label>
            Nome do salão
            <input value={settings.salonName} onChange={(event) => setSettings({ ...settings, salonName: event.target.value })} />
          </label>
          <label>
            Telefone
            <input value={settings.phone} onChange={(event) => setSettings({ ...settings, phone: event.target.value })} />
          </label>
          <label>
            Link de agendamento
            <input value={settings.bookingLink} onChange={(event) => setSettings({ ...settings, bookingLink: event.target.value })} />
          </label>
          <label>
            Horário padrão
            <input value={settings.businessHours} onChange={(event) => setSettings({ ...settings, businessHours: event.target.value })} />
          </label>
          <div className="settings-actions">
            <button className="primary-button" type="submit">Salvar configurações</button>
            {saved && <span>Configurações salvas</span>}
          </div>
        </form>
      </section>
    </>
  );
}

function DatabaseBadge({ status }) {
  const isOnline = status === 'Banco conectado';
  const isConnecting = status.includes('Conectando');
  const label = isOnline ? 'Banco online' : isConnecting ? 'Conectando banco' : 'Banco offline';

  return (
    <div className={`database-badge ${isOnline ? 'online' : isConnecting ? 'connecting' : 'offline'}`}>
      <span aria-hidden="true" />
      <strong>{label}</strong>
    </div>
  );
}

function App() {
  const [users, setUsers] = useState(loadUsers);
  const [appointments, setAppointments] = useState(() => loadCollection('salonflow-appointments', defaultAppointments));
  const [clients, setClients] = useState(() => loadCollection('salonflow-clients', defaultClients));
  const [cashRegisters, setCashRegisters] = useState(() => loadCollection('salonflow-cash-registers', defaultCashRegisters));
  const [settings, setSettings] = useState(() => loadCollection('salonflow-settings', defaultSettings));
  const [databaseStatus, setDatabaseStatus] = useState(databaseEnabled ? 'Conectando ao banco...' : 'Banco nao configurado');
  const [loggedUser, setLoggedUser] = useState(() => {
    const savedUser = localStorage.getItem('salonflow-logged-user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [activePage, setActivePage] = useState('agenda');

  useEffect(() => {
    if (!databaseEnabled) {
      return;
    }

    let cancelled = false;

    async function syncFromDatabase() {
      try {
        const [
          databaseUsers,
          databaseAppointments,
          databaseClients,
          databaseCashRegisters,
          databaseSettings
        ] = await Promise.all([
          loadFromDatabase('salonflow-users', defaultUsers),
          loadFromDatabase('salonflow-appointments', defaultAppointments),
          loadFromDatabase('salonflow-clients', defaultClients),
          loadFromDatabase('salonflow-cash-registers', defaultCashRegisters),
          loadFromDatabase('salonflow-settings', defaultSettings)
        ]);

        if (cancelled) return;

        const normalizedUsers = databaseUsers.map((user) => ({
          ...user,
          commissionPercent: user.commissionPercent ?? (user.role === 'Profissional' ? 35 : 0),
          specialty: user.specialty ?? (user.role === 'Profissional' ? 'Cabeleireira' : '')
        }));

        setUsers(normalizedUsers);
        setAppointments(databaseAppointments);
        setClients(databaseClients);
        setCashRegisters(databaseCashRegisters);
        setSettings(databaseSettings);

        localStorage.setItem('salonflow-users', JSON.stringify(normalizedUsers));
        localStorage.setItem('salonflow-appointments', JSON.stringify(databaseAppointments));
        localStorage.setItem('salonflow-clients', JSON.stringify(databaseClients));
        localStorage.setItem('salonflow-cash-registers', JSON.stringify(databaseCashRegisters));
        localStorage.setItem('salonflow-settings', JSON.stringify(databaseSettings));

        setDatabaseStatus('Banco conectado');
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setDatabaseStatus('Banco indisponivel');
        }
      }
    }

    syncFromDatabase();

    return () => {
      cancelled = true;
    };
  }, []);

  const menuItems = [
    { id: 'agenda', label: 'Agenda', icon: CalendarDays },
    { id: 'clientes', label: 'Clientes', icon: UsersRound },
    { id: 'usuarios', label: 'Usuários', icon: UserCog },
    { id: 'caixa', label: 'Caixa', icon: CreditCard },
    { id: 'financeiro', label: 'Financeiro', icon: WalletCards },
    { id: 'configuracoes', label: 'Configurações', icon: Settings }
  ];

  function handleLogin(user) {
    setLoggedUser(user);
    localStorage.setItem('salonflow-logged-user', JSON.stringify(user));
  }

  function handleLogout() {
    setLoggedUser(null);
    localStorage.removeItem('salonflow-logged-user');
  }

  if (!loggedUser) {
    return <LoginScreen users={users} onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src={logo} alt="Lyon Cabeleireiros" />
          <div>
            <strong>Lyon</strong>
            <span>Salão de Cabelereiros</span>
          </div>
        </div>

        <nav className="nav">
          {menuItems.map(({ id, label, icon: Icon }) => (
            <button
              className={activePage === id ? 'active' : ''}
              key={id}
              type="button"
              onClick={() => setActivePage(id)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <DatabaseBadge status={databaseStatus} />

          <div className="account-box">
            <div className="avatar">{loggedUser.name[0]}</div>
            <div>
              <strong>{loggedUser.name}</strong>
              <span>{loggedUser.role}</span>
            </div>
            <button className="icon-button dark" aria-label="Sair" onClick={handleLogout}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <main className="content">
        {activePage === 'agenda' && (
          <AgendaPage
            appointments={appointments}
            clients={clients}
            users={users}
            setAppointments={setAppointments}
          />
        )}
        {activePage === 'clientes' && <ClientesPage clients={clients} setClients={setClients} />}
        {activePage === 'usuarios' && <UsersPanel users={users} setUsers={setUsers} />}
        {activePage === 'caixa' && (
          <CaixaPage
            appointments={appointments}
            users={users}
            cashRegisters={cashRegisters}
            setCashRegisters={setCashRegisters}
            loggedUser={loggedUser}
          />
        )}
        {activePage === 'financeiro' && <FinanceiroPage appointments={appointments} users={users} />}
        {activePage === 'configuracoes' && (
          <ConfigPage
            settings={settings}
            setSettings={setSettings}
            databaseStatus={databaseStatus}
          />
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
