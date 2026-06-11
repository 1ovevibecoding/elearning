import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-logo">Lingua</div>

      <nav className="sidebar-nav" id="sidebar-nav">
        <div className="sidebar-section-label">Learn</div>

        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `sidebar-link${isActive ? ' active' : ''}`
          }
          id="nav-dashboard"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Dashboard
        </NavLink>

        <NavLink
          to="/vocabulary"
          className={({ isActive }) =>
            `sidebar-link${isActive ? ' active' : ''}`
          }
          id="nav-vocabulary"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <line x1="8" y1="7" x2="16" y2="7" />
            <line x1="8" y1="11" x2="13" y2="11" />
          </svg>
          Vocabulary
        </NavLink>

        <NavLink
          to="/flashcards"
          className={({ isActive }) =>
            `sidebar-link${isActive ? ' active' : ''}`
          }
          id="nav-flashcards"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M12 8v8" />
            <path d="M8 12h8" />
          </svg>
          Flashcards
        </NavLink>

        <NavLink
          to="/calendar"
          className={({ isActive }) =>
            `sidebar-link${isActive ? ' active' : ''}`
          }
          id="nav-calendar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Calendar
        </NavLink>

        <div className="sidebar-section-label">Practice</div>

        <NavLink
          to="/chat"
          className={({ isActive }) =>
            `sidebar-link${isActive ? ' active' : ''}`
          }
          id="nav-chat"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <line x1="8" y1="9" x2="16" y2="9" />
            <line x1="8" y1="13" x2="13" y2="13" />
          </svg>
          Chat
        </NavLink>

        <NavLink
          to="/grammar"
          className={({ isActive }) =>
            `sidebar-link${isActive ? ' active' : ''}`
          }
          id="nav-grammar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Grammar
        </NavLink>

        <NavLink
          to="/roleplay"
          className={({ isActive }) =>
            `sidebar-link${isActive ? ' active' : ''}`
          }
          id="nav-roleplay"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="5" />
            <path d="M20 21a8 8 0 1 0-16 0" />
            <path d="M12 13v3" />
          </svg>
          Roleplay
        </NavLink>
      </nav>

      <div className="sidebar-footer" id="sidebar-footer">
        <div className="sidebar-avatar">
          {user?.name?.charAt(0).toUpperCase() ?? '?'}
        </div>
        <div className="sidebar-user">
          <div className="sidebar-username">{user?.name}</div>
          <div className="sidebar-email">{user?.email}</div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={logout}
          id="btn-logout"
          title="Log out"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
