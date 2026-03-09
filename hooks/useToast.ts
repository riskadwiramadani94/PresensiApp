import { useState } from 'react';

interface ToastConfig {
  message: string;
  type: 'loading' | 'success' | 'error';
}

export const useToast = () => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<ToastConfig>({
    message: '',
    type: 'loading'
  });

  const showToast = (message: string, type: 'loading' | 'success' | 'error' = 'loading') => {
    setConfig({ message, type });
    setVisible(true);
  };

  const hideToast = () => {
    setVisible(false);
  };

  return {
    visible,
    config,
    showToast,
    hideToast
  };
};