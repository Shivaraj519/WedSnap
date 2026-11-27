import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { GuestHomePage } from './pages/GuestHomePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { WeddingPublic } from './types';
import { api } from './services/api';

export function App() {
  const [weddingSlug, setWeddingSlug] = useState<string>('vinutha-mayuresh');
  const [isAdminView, setIsAdminView] = useState(false);
  const [wedding, setWedding] = useState<WeddingPublic | null>(null);

  useEffect(() => {
    const path = window.location.pathname.replace(/^\//, '');
    if (path) {
      const parts = path.split('/');
      if (parts[0] === 'wedding' && parts[1]) {
        setWeddingSlug(parts[1]);
      } else if (parts[0] === 'admin') {
        setIsAdminView(true);
        if (parts[1]) setWeddingSlug(parts[1]);
      } else if (parts[0]) {
        setWeddingSlug(parts[0]);
      }
    }
  }, []);

  useEffect(() => {
    api
      .getWedding(weddingSlug)
      .then((data) => setWedding(data))
      .catch(() => {});
  }, [weddingSlug]);

  return (
    <div className="min-h-screen flex flex-col bg-ivory text-charcoal selection:bg-champagne-light">
      <Navbar
        wedding={wedding}
        onOpenFindMyPhotos={() => {
          const btn = document.querySelector('button[title="Find My Photos"]') as HTMLButtonElement;
          btn?.click();
        }}
        onOpenAdmin={() => setIsAdminView(true)}
        onOpenQR={() => {}}
      />

      <main className="flex-1">
        {isAdminView ? (
          <AdminDashboardPage
            weddingSlug={weddingSlug}
            onExit={() => setIsAdminView(false)}
          />
        ) : (
          <GuestHomePage
            weddingSlug={weddingSlug}
            onOpenAdmin={() => setIsAdminView(true)}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
