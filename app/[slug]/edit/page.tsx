'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';
import { useAgentProfile } from '@/contexts/AgentProfileContext';

export default function EditProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { name, tagline, bio, socialLinks, updateProfile } = useAgentProfile();

  const [formName, setFormName] = useState(name);
  const [formTagline, setFormTagline] = useState(tagline);
  const [formBio, setFormBio] = useState(bio);
  const [formFacebook, setFormFacebook] = useState(socialLinks.facebook || '');
  const [formMessenger, setFormMessenger] = useState(socialLinks.messenger || '');
  const [formWhatsapp, setFormWhatsapp] = useState(socialLinks.whatsapp || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateProfile({
      name: formName,
      tagline: formTagline,
      bio: formBio,
      socialLinks: {
        facebook: formFacebook || undefined,
        messenger: formMessenger || undefined,
        whatsapp: formWhatsapp || undefined,
      },
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      router.push(`/${slug}`);
    }, 1200);
  };

  const inputClass =
    'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-colors bg-white';

  return (
    <div className={`${LAYOUT_NAVBAR_OFFSET} min-h-screen bg-gray-50/50`}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push(`/${slug}`)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1
              className="text-xl sm:text-2xl font-bold text-gray-900"
              style={{ fontFamily: 'Poppins', fontWeight: 700 }}
            >
              Edit Profile
            </h1>
            <p
              className="text-sm text-gray-500"
              style={{ fontFamily: 'Poppins', fontWeight: 400 }}
            >
              Update your public profile information
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6">
            {/* Name */}
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-2"
                style={{ fontFamily: 'Poppins', fontWeight: 500 }}
              >
                Full Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className={inputClass}
                style={{ fontFamily: 'Poppins' }}
                placeholder="Your full name"
              />
            </div>

            {/* Tagline */}
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-2"
                style={{ fontFamily: 'Poppins', fontWeight: 500 }}
              >
                Tagline
              </label>
              <input
                type="text"
                value={formTagline}
                onChange={(e) => setFormTagline(e.target.value)}
                className={inputClass}
                style={{ fontFamily: 'Poppins' }}
                placeholder="Your unique selling proposition"
                maxLength={60}
              />
              <p className="text-xs text-gray-400 mt-1.5" style={{ fontFamily: 'Poppins' }}>
                {formTagline.length}/60 characters
              </p>
            </div>

            {/* Bio */}
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-2"
                style={{ fontFamily: 'Poppins', fontWeight: 500 }}
              >
                Bio
              </label>
              <textarea
                value={formBio}
                onChange={(e) => setFormBio(e.target.value)}
                className={`${inputClass} resize-none`}
                style={{ fontFamily: 'Poppins' }}
                rows={4}
                placeholder="Tell clients about yourself..."
                maxLength={300}
              />
              <p className="text-xs text-gray-400 mt-1.5" style={{ fontFamily: 'Poppins' }}>
                {formBio.length}/300 characters
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 pt-2">
              <h3
                className="text-sm font-semibold text-gray-700 mb-4"
                style={{ fontFamily: 'Poppins', fontWeight: 600 }}
              >
                Social & Contact Links
              </h3>
              <div className="space-y-4">
                {/* Facebook */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 mb-2" style={{ fontFamily: 'Poppins', fontWeight: 500 }}>
                    <span className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </span>
                    Facebook
                  </label>
                  <input
                    type="url"
                    value={formFacebook}
                    onChange={(e) => setFormFacebook(e.target.value)}
                    className={inputClass}
                    style={{ fontFamily: 'Poppins' }}
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>

                {/* Messenger */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 mb-2" style={{ fontFamily: 'Poppins', fontWeight: 500 }}>
                    <span className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-[#0084FF]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8.2l3.131 3.259L19.752 8.2l-6.561 6.763z" />
                      </svg>
                    </span>
                    Messenger
                  </label>
                  <input
                    type="url"
                    value={formMessenger}
                    onChange={(e) => setFormMessenger(e.target.value)}
                    className={inputClass}
                    style={{ fontFamily: 'Poppins' }}
                    placeholder="https://m.me/yourpage"
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 mb-2" style={{ fontFamily: 'Poppins', fontWeight: 500 }}>
                    <span className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </span>
                    WhatsApp
                  </label>
                  <input
                    type="url"
                    value={formWhatsapp}
                    onChange={(e) => setFormWhatsapp(e.target.value)}
                    className={inputClass}
                    style={{ fontFamily: 'Poppins' }}
                    placeholder="https://wa.me/639123456789"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50/80 border-t border-gray-100 px-6 sm:px-8 py-4 flex items-center justify-end gap-3">
            <button
              onClick={() => router.push(`/${slug}`)}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              style={{ fontFamily: 'Poppins', fontWeight: 500 }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saved}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0B5858] hover:bg-[#094848] rounded-xl transition-colors disabled:opacity-70 cursor-pointer"
              style={{ fontFamily: 'Poppins', fontWeight: 600 }}
            >
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
