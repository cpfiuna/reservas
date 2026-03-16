
import { Bug } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="border-t border-gray-200 py-6 px-4 mt-auto">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
        <div className="mb-3 sm:mb-0">
          2025 {" / "}
          <Link 
            to="https://cpfiuna.io" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-gray-700 transition-colors"
          >
            Club de Programación
          </Link>{" / "}
          <Link 
            to="http://www.ing.una.py" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-gray-700 transition-colors"
          >
            FIUNA
          </Link>
        </div>
        <Link 
          to="https://forms.gle/bErcqTbTmQKzM4xR9" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center hover:text-gray-700 transition-colors"
        >
          <Bug className="h-4 w-4 mr-1" />
          <span>Reportar problemas</span>
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
