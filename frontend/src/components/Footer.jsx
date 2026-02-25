import React from 'react';
import { Link } from 'react-router-dom';
import { FaApple, FaGithub, FaLinkedinIn } from 'react-icons/fa';
import { FiGlobe, FiMail, FiMapPin, FiPhone } from 'react-icons/fi';
import { IoLogoGooglePlaystore } from 'react-icons/io5';

function Footer() {
  const currentYear = new Date().getFullYear();
  const [activeSection, setActiveSection] = React.useState(null);

  const companyInfo = {
    about: {
      title: 'About Us',
      text: 'Foodooza is a full-stack food delivery project where users can discover restaurants, search food items, place orders, and track deliveries. It includes role-based dashboards for users, restaurant owners, delivery partners, and admin management.'
    },
    careers: {
      title: 'Careers',
      text: 'We are not actively hiring through this demo project right now. For opportunities and collaboration, connect through GitHub, LinkedIn, or the portfolio links in this footer.'
    },
    privacy: {
      title: 'Privacy Policy',
      text: 'Foodooza stores only required account and order data to provide food delivery features. We do not sell personal information, and data access is limited to relevant roles in the platform.'
    },
    terms: {
      title: 'Terms of Service',
      text: 'By using Foodooza, users agree to provide accurate account details, follow platform rules, and use the service lawfully. Orders, delivery updates, and account actions are subject to application workflows.'
    }
  };

  return (
    <footer
      className="w-full mt-10 border-t bg-gradient-to-br from-[#fff7f1] via-[#ffe9db] to-[#fff6ed]"
      style={{ borderColor: '#ffd2bf', color: 'var(--text-primary)' }}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <h3 className="mb-4 text-2xl font-bold italic text-[#ff4d2d]">Foodooza</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Delivering happiness, one order at a time.</p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://github.com/sourav81R"
                target="_blank"
                rel="noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-full border transition hover:border-[#ff4d2d] hover:text-[#ff4d2d]"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}
                aria-label="GitHub"
              >
                <FaGithub size={19} />
              </a>
              <a
                href="https://linkedin.com/in/souravchowdhury-2003r"
                target="_blank"
                rel="noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-full border transition hover:border-[#ff4d2d] hover:text-[#ff4d2d]"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}
                aria-label="LinkedIn"
              >
                <FaLinkedinIn size={18} />
              </a>
              <a
                href="https://portfolio-topaz-eight-91.vercel.app/"
                target="_blank"
                rel="noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-full border transition hover:border-[#ff4d2d] hover:text-[#ff4d2d]"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}
                aria-label="Portfolio"
              >
                <FiGlobe size={18} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-2xl font-semibold">Quick Links</h3>
            <ul className="space-y-2" style={{ color: 'var(--text-secondary)' }}>
              <li><Link to="/" className="transition hover:text-[#ff4d2d]">Home</Link></li>
              <li><Link to="/favorites" className="transition hover:text-[#ff4d2d]">Favorites</Link></li>
              <li><Link to="/my-orders" className="transition hover:text-[#ff4d2d]">My Orders</Link></li>
              <li><Link to="/profile" className="transition hover:text-[#ff4d2d]">My Profile</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-2xl font-semibold">Company</h3>
            <ul className="space-y-2" style={{ color: 'var(--text-secondary)' }}>
              <li>
                <a
                  href="#"
                  className="transition hover:text-[#ff4d2d] cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveSection('about');
                  }}
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="transition hover:text-[#ff4d2d] cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveSection('careers');
                  }}
                >
                  Careers
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="transition hover:text-[#ff4d2d] cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveSection('privacy');
                  }}
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="transition hover:text-[#ff4d2d] cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveSection('terms');
                  }}
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-2xl font-semibold">Contact Us</h3>
            <ul className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
              <li>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Bariupur%2C%20India"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3 transition hover:text-[#ff4d2d]"
                >
                  <FiMapPin className="mt-1 text-[#ff4d2d]" />
                  <span>Bariupur, India</span>
                </a>
              </li>
              <li className="flex items-start gap-3">
                <FiPhone className="mt-1 text-[#ff4d2d]" />
                <span>+91 00000-00000</span>
              </li>
              <li className="flex items-start gap-3">
                <FiMail className="mt-1 text-[#ff4d2d]" />
                <span>support@foodooza.com</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-2xl font-semibold">Download App</h3>
            <div className="flex flex-col gap-3">
              <a
                href="https://www.apple.com/app-store/"
                target="_blank"
                rel="noreferrer"
                className="flex w-[180px] items-center gap-2.5 rounded-xl border border-[#f0bf9f] bg-[#fff2e8] px-3 py-2 text-[#0e2b56] shadow-sm transition hover:bg-[#ffe7d7] hover:border-[#e8aa84]"
                aria-label="Download on the App Store"
              >
                <FaApple size={20} />
                <span className="leading-tight">
                  <span className="block text-[10px] text-[#315181]">Download on the</span>
                  <span className="block text-[15px] font-semibold leading-[1.1]">App Store</span>
                </span>
              </a>

              <a
                href="https://play.google.com/store/apps"
                target="_blank"
                rel="noreferrer"
                className="flex w-[180px] items-center gap-2.5 rounded-xl border border-[#f0bf9f] bg-[#fff2e8] px-3 py-2 text-[#0e2b56] shadow-sm transition hover:bg-[#ffe7d7] hover:border-[#e8aa84]"
                aria-label="Get it on Google Play"
              >
                <IoLogoGooglePlaystore size={19} />
                <span className="leading-tight">
                  <span className="block text-[10px] text-[#315181]">GET IT ON</span>
                  <span className="block text-[15px] font-semibold leading-[1.1]">Google Play</span>
                </span>
              </a>
            </div>
          </div>
        </div>

        {activeSection && (
          <div
            className="mt-8 rounded-xl border p-4 sm:p-5"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <h4 className="text-lg font-semibold text-[#ff4d2d]">{companyInfo[activeSection].title}</h4>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              {companyInfo[activeSection].text}
            </p>
          </div>
        )}

        <div className="mt-10 border-t pt-5 text-center text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
          <p>&copy; {currentYear} Foodooza. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
