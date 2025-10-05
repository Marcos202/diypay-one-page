import { Link } from 'react-router-dom';

export const AuthFooter = () => {
  return (
    <footer className="text-center space-y-2 mt-4 pb-4">
      <div className="text-xs text-gray-500/80">
        Copyright © DiyPay 2025
      </div>
      <div className="text-xs text-gray-500/80 space-x-2">
        <Link to="/p/termos-de-uso" className="hover:underline">
          Termos de Uso
        </Link>
        <span>|</span>
        <Link to="/p/politicas-de-privacidade" className="hover:underline">
          Políticas de Privacidade
        </Link>
        <span>|</span>
        <Link to="/p/contato" className="hover:underline">
          Contato
        </Link>
      </div>
    </footer>
  );
};