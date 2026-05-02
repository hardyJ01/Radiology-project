import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/',        label: 'Home',     icon: '🏠' },
  { to: '/analyze', label: 'Analyze',  icon: '🩻' },
  { to: '/history', label: 'History',  icon: '📋' },
];

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <NavLink to="/" className="navbar-brand">
          <div className="navbar-logo-icon">🩻</div>
          <span className="navbar-brand-text">
            Radiology<span>AI</span>
          </span>
        </NavLink>

        <div className="navbar-nav">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}