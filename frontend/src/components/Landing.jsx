import React from 'react';
import { Shield, Zap, Users, ArrowRight } from 'lucide-react';

const Landing = ({ onGetStarted }) => {
  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      <div className="sketch-header">
        <div>
          <h1 className="sketch-title">Ledger Knight</h1>
          <p className="sketch-subtitle">
            Secure, transparent, and efficient blockchain-based budget management
          </p>
        </div>
      </div>
      
      <p style={{ color: 'var(--sketch-secondary)', marginBottom: 32, fontSize: 16 }}>
        Secure, transparent, and efficient blockchain-based budget management for institutions.
      </p>
      
      <div className="sketch-grid" style={{ marginBottom: 32 }}>
        <div className="sketch-card">
          <Shield className="sketch-icon" style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 400 }}>Blockchain Security</div>
          <div className="sketch-text-small">Transparent and immutable transaction records</div>
        </div>
        <div className="sketch-card">
          <Zap className="sketch-icon" style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 400 }}>Real-time Updates</div>
          <div className="sketch-text-small">Live balance tracking and transaction status</div>
        </div>
        <div className="sketch-card">
          <Users className="sketch-icon" style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 400 }}>Role Management</div>
          <div className="sketch-text-small">Separate dashboards for auditors and associates</div>
        </div>
      </div>
      
      <div className="sketch-text-center">
        <button onClick={onGetStarted} className="sketch-btn sketch-btn-primary" style={{ padding: '12px 24px', fontSize: 16 }}>
          Get Started <ArrowRight size={16} style={{ verticalAlign: 'middle', marginLeft: 8, transform: 'rotate(-2deg)' }} />
        </button>
      </div>
      
      <div className="sketch-card sketch-mt-16">
        <div className="sketch-text-small sketch-text-center">
          Built for institutions that value transparency, security, and efficient financial management
        </div>
      </button>
    </div>
  );
};

export default Landing;
