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
    <div style={{ padding: 24, maxWidth: 480, margin: '40px auto' }}>
      <div className="sketch-header">
        <h2 className="sketch-title" style={{ fontSize: 24 }}>Authentication</h2>
      </div>
      
      <div className="sketch-tabs">
        <button 
          onClick={() => setActiveTab('register')} 
          className={`sketch-tab ${activeTab === 'register' ? 'active' : ''}`}
        >
          Register Institution
        </button>
        <button 
          onClick={() => setActiveTab('login')} 
          className={`sketch-tab ${activeTab === 'login' ? 'active' : ''}`}
        >
          Login
        </button>
      </div>
      
      {activeTab === 'register' ? (
        <div className="sketch-card">
          <form onSubmit={handleRegister} className="sketch-form">
            <input 
              className="sketch-input" 
              placeholder="Institution name" 
              value={formData.name} 
              onChange={e => handleInputChange('name', e.target.value)} 
            />
            <input 
              className="sketch-input" 
              placeholder="Location" 
              value={formData.location} 
              onChange={e => handleInputChange('location', e.target.value)} 
            />
            <input 
              className="sketch-input" 
              placeholder="Auditor password" 
              type="password" 
              value={formData.auditorPassword} 
              onChange={e => handleInputChange('auditorPassword', e.target.value)} 
            />
            <button type="submit" className="sketch-btn sketch-btn-primary">
              Register Institution
            </button>
          </form>
        </div>
      ) : (
        <div className="sketch-card">
          <form onSubmit={handleLogin} className="sketch-form">
            <input 
              className="sketch-input" 
              placeholder="Institution ID" 
              value={formData.institutionId} 
              onChange={e => handleInputChange('institutionId', e.target.value)} 
            />
            <select 
              className="sketch-input" 
              value={formData.userType} 
              onChange={e => handleInputChange('userType', e.target.value)}
            >
              <option value="auditor">Auditor</option>
              <option value="associate">Associate</option>
            </select>
            {formData.userType === 'associate' && (
              <input 
                className="sketch-input" 
                placeholder="Associate ID" 
                value={formData.associateId} 
                onChange={e => handleInputChange('associateId', e.target.value)} 
              />
            )}
            <input 
              className="sketch-input" 
              placeholder="Password" 
              type="password" 
              value={formData.loginPassword} 
              onChange={e => handleInputChange('loginPassword', e.target.value)} 
            />
            <button type="submit" className="sketch-btn sketch-btn-primary">
              Login
            </button>
          </form>
        </form>
      )}
    </div>
  );
};

export default Auth;
