import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowUpRight, Menu, TicketCheck, X } from 'lucide-react'
import { brand } from '../config/brand'
import { useSession } from '../context/SessionContext'

function SiteLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { user, logOut } = useSession()
  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    document.title = brand.title
  }, [])

  return <>
    <div className="preview-banner"><span className="preview-dot" /> PREVIEW MODE <span className="preview-divider">/</span> Sample events only · accounts and bookings are not connected</div>
    <header className="site-header"><div className="nav-inner">
      <Link className="brand" to="/" onClick={closeMenu}><span className="brand-icon"><TicketCheck size={19} /></span><span>{brand.name}</span></Link>
      <button className="mobile-menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
      <nav className={`primary-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
        <NavLink end to="/" onClick={closeMenu}>Home</NavLink><NavLink to="/events" onClick={closeMenu}>Events</NavLink><NavLink to="/bookings" onClick={closeMenu}>My bookings</NavLink>
        {user?.role === 'organizer' && <NavLink to="/organizer">Organizer workspace</NavLink>}
        {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        <div className="nav-account">{user ? <><span className="nav-user-name">{user.name}</span><button className="nav-logout" onClick={async () => { await logOut(); closeMenu() }}>Log out</button></> : <><NavLink to="/login" onClick={closeMenu}>Log in</NavLink><Link className="nav-register" to="/register" onClick={closeMenu}>Register <ArrowUpRight size={14} /></Link></>}</div>
      </nav>
    </div></header>
    <div key={location.pathname} className="route-content">{children}</div>
    <footer className="site-footer"><div className="footer-main"><div><Link className="brand footer-brand" to="/"><span className="brand-icon"><TicketCheck size={19} /></span><span>{brand.name}</span></Link><p>{brand.tagline}<br />A city full of possibility.</p></div><div className="footer-links"><div><span>EXPLORE</span><Link to="/events">All events</Link><Link to="/events?category=music">Live music</Link><Link to="/events?category=arts">Art & culture</Link></div><div><span>YOUR ACCOUNT</span><Link to="/bookings">My bookings</Link><Link to="/login">Log in</Link><Link to="/register">Register</Link></div>{user?.role === 'admin' && <div><span>ADMIN</span><Link to="/admin">Admin dashboard <ArrowUpRight size={13} /></Link></div>}</div></div><div className="footer-bottom"><span>© 2026 {brand.name} · College project preview</span><a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noreferrer"><ArrowUpRight size={17} /></a></div></footer>
  </>
}

export default SiteLayout