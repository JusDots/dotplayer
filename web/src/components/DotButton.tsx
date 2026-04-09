import React from 'react';
import './DotButton.css';

interface DotButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  active?: boolean;
  variant?: 'dot' | 'pill';
}

const DotButton: React.FC<DotButtonProps> = ({ onClick, children, active, variant = 'dot' }) => {
  return (
    <button 
      className={`dot-button ${variant === 'pill' ? 'pill' : ''} ${active ? 'active' : ''}`} 
      onClick={onClick}
    >
      <span className="dot-button-inner">
        {children}
      </span>
    </button>
  );
};

export default DotButton;
