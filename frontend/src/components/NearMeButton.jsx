import { useState } from 'react'
import { LoaderCircle, MapPin } from 'lucide-react'

function NearMeButton({ onLocated, className = '' }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  function requestLocation() {
    setMessage('')
    if (!navigator.geolocation) {
      setMessage('Location is unavailable in this browser. Enter a city, area, or postal code instead.')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setLoading(false)
      setMessage('Using your location for this search only. It is not saved to your account.')
      onLocated({ lat: coords.latitude, lng: coords.longitude })
    }, (error) => {
      setLoading(false)
      setMessage(error.code === error.PERMISSION_DENIED
        ? 'Location permission was denied. Search by city, area, or postal code instead.'
        : 'Could not get your location. Search by city, area, or postal code instead.')
    }, { enableHighAccuracy: false, maximumAge: 300000, timeout: 12000 })
  }

  return <div className={`near-me-control ${className}`}>
    <button className="near-me-button" type="button" onClick={requestLocation} disabled={loading}>
      {loading ? <LoaderCircle size={16} className="spin-icon" /> : <MapPin size={16} />}
      {loading ? 'Finding location' : 'Near Me'}
    </button>
    {message && <span className="location-status" role="status">{message}</span>}
  </div>
}

export default NearMeButton