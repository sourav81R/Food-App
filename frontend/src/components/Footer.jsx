import React from 'react';

function Footer() {
  return (
    <footer
      className="w-full border-t px-4 py-4"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
        <p className="text-base font-bold text-[#ff4d2d]">PetPooja</p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Delivering happiness, one order at a time.
        </p>
        <a
          className="text-xs sm:text-sm hover:underline"
          style={{ color: 'var(--text-muted)' }}
          href="https://github.com/sourav81R"
          target="_blank"
          rel="noreferrer"
        >
          Sourav Chowdhury
        </a>
      </div>
    </footer>
  );
}

export default Footer;
