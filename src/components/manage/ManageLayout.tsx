import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/manage/items', label: 'Master list' },
  { to: '/manage/kits', label: 'Kits' },
  { to: '/manage/tags', label: 'Tags' },
  { to: '/manage/import', label: 'Notion import' },
  { to: '/manage/backup', label: 'Export / Import' },
  { to: '/manage/api', label: 'API key' },
]

export function ManageLayout() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <NavLink to="/" className="text-xs text-slate-500 hover:text-slate-300">← Trips</NavLink>
        <h1 className="text-xl font-bold text-slate-100">Manage</h1>
      </div>
      <div className="flex gap-6">
        <nav className="w-40 flex-shrink-0 space-y-1">
          {links.map(l => (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) => `block px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-indigo-900 text-indigo-200' : 'text-slate-400 hover:text-slate-200'}`}
            >{l.label}</NavLink>
          ))}
        </nav>
        <div className="flex-1 min-w-0"><Outlet /></div>
      </div>
    </div>
  )
}
