import { NavLink } from 'react-router-dom';
import { TABS } from '../constants.js';
import { TAB_ICONS } from './icons.jsx';
import { color } from '../theme.js';

export default function TabBar() {
  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        padding: '9px 18px calc(12px + env(safe-area-inset-bottom))',
        background: 'rgba(255,255,255,.94)',
        backdropFilter: 'blur(18px)',
        borderTop: '1px solid rgba(16,32,64,.08)',
        display: 'grid',
        gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
        gap: 4
      }}
    >
      {TABS.map((tab) => {
        const Icon = TAB_ICONS[tab.id];
        return (
          <NavLink
            key={tab.id}
            to={tab.to}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '6px 0',
              borderRadius: 12,
              color: isActive ? color.brand : '#98A6BD',
              textDecoration: 'none'
            })}
          >
            <Icon />
            <span style={{ fontSize: 10.5, fontWeight: 600 }}>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
