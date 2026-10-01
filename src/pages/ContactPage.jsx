import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/contact.css';

const CONTACTS = [
  {
    id: 'alex-director',
    name: 'Pratham Shrivas',
    role: <>Website Admin <br /> (Moderator)</>,
    instagram: 'https://www.instagram.com/__mr__pratham__07',
    theme: 'indigo',
    delayClass: 'contact-delay-1',
    avatar: 'https://i.ibb.co/jkKv7K3g/539838366-17984605379854379-8320994099651552121-n.jpg',
  },
  {
    id: 'david-ops',
    name: 'Anurag Raut',
    role: <>Super Administrator <br /> (Site Owner)</>,
    instagram: 'https://www.instagram.com/sudo.anu',
    theme: 'purple',
    delayClass: 'contact-delay-2',
    avatar: 'https://i.ibb.co/XfpQy9g2/743777940-18085552643643919-3774840002052550993-n.jpg',
  },
  {
    id: 'sophia-sec',
    name: 'Parimal Pande',
    role: 'Public Relations Representative',
    instagram: 'https://www.instagram.com/parimal__05',
    theme: 'pink',
    delayClass: 'contact-delay-3',
    avatar: 'https://i.ibb.co/k25KLrSH/762866974-18124551622705411-7788019683024051105-n.jpg',
  },
];

export default function ContactPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Admin Contacts - Premium Area';
    return () => {
      document.title = prevTitle;
    };
  }, []);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="contact-page-root" id="contact-page">
      {/* Ambient Glowing Orbs */}
      <div className="contact-glow-orb contact-orb-1" aria-hidden="true" />
      <div className="contact-glow-orb contact-orb-2" aria-hidden="true" />

      {/* Header */}
      <header className="contact-header">
        <button
          type="button"
          onClick={handleBack}
          className="contact-back-btn"
          aria-label="Go back to previous page"
          id="contact-back-btn"
        >
          <div className="contact-back-icon-box">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </div>
          <span className="contact-back-label">Back</span>
        </button>

        <h1 className="contact-header-title">Admin</h1>
      </header>

      {/* Main Grid */}
      <main className="contact-main">
        <div className="contact-cards-grid">
          {CONTACTS.map((contact) => (
            <a
              key={contact.id}
              href={
                contact.instagram.startsWith('http')
                  ? contact.instagram
                  : `https://www.instagram.com/${contact.instagram.replace(/^@/, '')}/`
              }
              target="_blank"
              rel="noopener noreferrer"
              className={`contact-card contact-reveal-up ${contact.delayClass} ${contact.theme}`}
              id={`contact-card-${contact.id}`}
            >
              <div className="contact-card-overlay" aria-hidden="true" />

              <div className="contact-avatar-wrapper">
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="contact-avatar-img"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="contact-avatar-dimmer" aria-hidden="true" />
              </div>

              <h2 className="contact-name">{contact.name}</h2>
              <p className="contact-role">{contact.role}</p>

              <div className="contact-indicator-wrap">
                <span className="contact-indicator">Contact</span>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
