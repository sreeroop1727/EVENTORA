import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '../context/SessionContext'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useSession()
  const location = useLocation()

  if (loading) return <main className="route-loading" role="status">Checking your session…</main>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default ProtectedRoute
