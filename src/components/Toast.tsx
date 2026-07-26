import React from 'react';

interface Props {
  message: string;
  visible: boolean;
  type?: 'success' | 'error';
}

const Toast: React.FC<Props> = ({ message, visible, type = 'success' }) => {
  const icon = type === 'success' ? 'fa-check-circle text-green-400' : 'fa-times-circle text-red-400';

  return (
    <div className={`toast ${visible ? 'show' : ''}`}>
      <i className={`fas ${icon}`}></i>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

export default Toast;
