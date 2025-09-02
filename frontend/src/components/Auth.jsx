import React, { useState } from 'react';
import axios from 'axios';

const BACKEND = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

const Auth = ({ onLogin, setMessage }) => {
  const [activeTab, setActiveTab] = useState('register');
  const [formData, setFormData] = useState({ name: '', location: '', auditorPassword: '', institutionId: '', loginPassword: '', associateId: '', userType: 'auditor' });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setMessage?.(null);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.location.trim() || !formData.auditorPassword) {
      setMessage?.({ type: 'error', text: 'Please fill all required fields' });
      return;
    }
    try {
      const res = await axios.post(`${BACKEND}/auth/register`, { name: formData.name, location: formData.location, auditorPassword: formData.auditorPassword });
      const data = res.data;
      setFormData(prev => ({ ...prev, institutionId: data.institutionId, loginPassword: formData.auditorPassword }));
      setActiveTab('login');
      setTimeout(() => onLogin(data.institutionId, formData.auditorPassword, 'auditor'), 500);
    } catch (err) {
      setMessage?.({ type: 'error', text: err.response?.data?.error || 'Registration failed' });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.institutionId || !formData.loginPassword) {
      setMessage?.({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }
    if (formData.userType === 'associate' && !formData.associateId) {
      setMessage?.({ type: 'error', text: 'Associate ID is required for associate login' });
      return;
    }
    try {
      await onLogin(formData.institutionId, formData.loginPassword, formData.userType, formData.associateId || '');
    } catch (err) {
      setMessage?.({ type: 'error', text: err.response?.data?.error || err.message || 'Login failed' });
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 560, margin: '40px auto', fontFamily: 'Inter, system-ui, Arial' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setActiveTab('register')} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: activeTab === 'register' ? '#0f172a' : 'white', color: activeTab === 'register' ? 'white' : '#0f172a' }}>Register</button>
        <button onClick={() => setActiveTab('login')} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: activeTab === 'login' ? '#0f172a' : 'white', color: activeTab === 'login' ? 'white' : '#0f172a' }}>Login</button>
      </div>
      {activeTab === 'register' ? (
        <form onSubmit={handleRegister} style={{ display: 'grid', gap: 12 }}>
          <input placeholder="Institution name" value={formData.name} onChange={e => handleInputChange('name', e.target.value)} />
          <input placeholder="Location" value={formData.location} onChange={e => handleInputChange('location', e.target.value)} />
          <input placeholder="Auditor password" type="password" value={formData.auditorPassword} onChange={e => handleInputChange('auditorPassword', e.target.value)} />
          <button type="submit" style={{ background: 'black', color: 'white', padding: '10px 12px', borderRadius: 8, border: 0 }}>Register</button>
        </form>
      ) : (
        <form onSubmit={handleLogin} style={{ display: 'grid', gap: 12 }}>
          <input placeholder="Institution ID" value={formData.institutionId} onChange={e => handleInputChange('institutionId', e.target.value)} />
          <select value={formData.userType} onChange={e => handleInputChange('userType', e.target.value)}>
            <option value="auditor">Auditor</option>
            <option value="associate">Associate</option>
          </select>
          {formData.userType === 'associate' && (
            <input placeholder="Associate ID" value={formData.associateId} onChange={e => handleInputChange('associateId', e.target.value)} />
          )}
          <input placeholder="Password" type="password" value={formData.loginPassword} onChange={e => handleInputChange('loginPassword', e.target.value)} />
          <button type="submit" style={{ background: 'black', color: 'white', padding: '10px 12px', borderRadius: 8, border: 0 }}>Login</button>
        </form>
      )}
    </div>
  );
};

export default Auth;
