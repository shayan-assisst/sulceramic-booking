export function SiteFooter() {
  return (
    <footer className="border-t border-terracotta-200/60 bg-cream-50">
      <div className="container py-10 grid gap-6 md:grid-cols-3 text-sm text-clay-mid">
        <div>
          <div className="font-serif text-base text-clay-dark mb-1">Sul Ceramic</div>
          <p>
            A ceramics studio in the south of Portugal. Hand-thrown work, residencies, and an
            open-door studio for first-time potters.
          </p>
        </div>
        <div>
          <div className="font-serif text-base text-clay-dark mb-1">Visit</div>
          <p>By appointment only.</p>
          <p>sulceramic.com</p>
        </div>
        <div>
          <div className="font-serif text-base text-clay-dark mb-1">Hours</div>
          <p>Mon · Wed · Fri — 10:00–20:00</p>
          <p>Saturday — 10:00–16:00</p>
        </div>
      </div>
      <div className="border-t border-terracotta-100 py-4">
        <div className="container text-xs text-clay-mid flex justify-between">
          <span>© {new Date().getFullYear()} Sul Ceramic</span>
          <span>Made with clay and care.</span>
        </div>
      </div>
    </footer>
  );
}
