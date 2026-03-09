import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useT } from '../lib/i18n';

export function Callback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const t = useT();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      login(token).then(() => navigate('/servers'));
    } else {
      navigate('/login');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-[var(--text-secondary)]">{t('web.callback.loading')}</p>
    </div>
  );
}
