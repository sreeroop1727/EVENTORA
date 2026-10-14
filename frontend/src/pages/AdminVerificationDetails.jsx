import { useEffect, useState } from 'react'
import { ArrowLeft, Download, FileText, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getApiError, api } from '../services/api'

function AdminVerificationDetails() {
  const { profileId } = useParams()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/admin/organizers/verification/${profileId}`)
      .then((response) => setProfile(response.data.data.profile))
      .catch((requestError) => setError(getApiError(requestError)))
      .finally(() => setLoading(false))
  }, [profileId])

  if (loading) return <main className="route-loading" role="status">Loading verification application…</main>

  return <main className="page-main admin-page"><div className="section-wrap"><Link className="back-link" to="/admin"><ArrowLeft size={16} /> Back to control center</Link>
    {error ? <p className="api-notice" role="alert">{error}</p> : <><div className="dashboard-heading"><div><p className="eyebrow">Organizer verification / Application</p><h1>{profile.organizationName}<span className="heading-period">.</span></h1><p>{profile.user?.name} · {profile.user?.email}</p></div><span className="admin-status">{profile.verificationStatus}</span></div><section className="application-details"><div><span>CONTACT</span><p>{profile.contactPhone}</p></div><div><span>SUBMITTED</span><p>{new Date(profile.createdAt).toLocaleString()}</p></div><div className="application-description"><span>ORGANIZATION DESCRIPTION</span><p>{profile.description}</p></div><div className="application-description"><span>REVIEW HISTORY</span><p>{profile.reviewMessage || 'No review message recorded.'}{profile.reviewedAt && ` · ${new Date(profile.reviewedAt).toLocaleString()}`}</p></div></section><section className="admin-table-section"><div className="table-heading"><div><p className="eyebrow">Private files</p><h2>Verification documents</h2></div><ShieldCheck size={19} /></div>{profile.documents.length ? <div className="document-list">{profile.documents.map((document) => <div className="document-row" key={document.storageName}><FileText size={19} /><span><strong>{document.originalName}</strong><small>{document.mimeType} · {(document.size / 1024).toFixed(0)} KB</small></span><a href={`${api.defaults.baseURL}/admin/organizers/verification/${profile._id}/documents/${encodeURIComponent(document.storageName)}`}><Download size={16} /> Download</a></div>)}</div> : <p className="admin-empty">No documents were submitted.</p>}</section></>}
  </div></main>
}

export default AdminVerificationDetails