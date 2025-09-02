import React from 'react';
import { Shield, Zap, Users, ArrowRight } from 'lucide-react';

const Landing = ({ onGetStarted }) => {
  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto', fontFamily: 'Inter, system-ui, Arial' }}>
      <h1 style={{ fontSize: 36, marginBottom: 8 }}>Ledger Knight</h1>
      <p style={{ color: '#475569', marginBottom: 24 }}>
        Secure, transparent, and efficient blockchain-based budget management for institutions.
      </p>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 24 }}>
        <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 12 }}>
          <Shield size={20} /> Blockchain-powered transparency
        </div>
        <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 12 }}>
          <Zap size={20} /> Live balance & tx status
        </div>
        <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 12 }}>
          <Users size={20} /> Role-based dashboards
        </div>
      </div>
      <button onClick={onGetStarted} style={{ background: 'black', color: 'white', padding: '12px 16px', borderRadius: 8, border: 0, cursor: 'pointer' }}>
        Get started <ArrowRight size={16} style={{ verticalAlign: 'middle', marginLeft: 6 }} />
      </button>
    </div>
  );
};

export default Landing;
