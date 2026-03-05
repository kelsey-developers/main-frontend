'use client';

import React from 'react';
import Link from 'next/link';
import type { InventoryFeatureLink } from '../types';

const FEATURE_LINKS: InventoryFeatureLink[] = [
    { href: '/sales-report/inventory/items', title: 'Inventory items', icon: 'items' },
];

const IconSvg: React.FC<{ icon: InventoryFeatureLink['icon'] }> = ({ icon }) => {
    const className = 'w-5 h-5 text-[#0B5858] flex-shrink-0';
    switch (icon) {
        case 'items':
            return (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            );
    }
};

const InventoryDashboardLinks: React.FC = () => {
    return (
        <>
            <h2 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Poppins' }}>
                Features
            </h2>
            <div className="space-y-4">
                {FEATURE_LINKS.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 hover:ring-2 hover:ring-[#0B5858]/20 hover:border-[#0B5858] transition-colors group"
                        style={{ fontFamily: 'Poppins' }}
                    >
                        <IconSvg icon={link.icon} />
                        <span className="flex-1 text-md font-medium group-hover:text-[#0B5858] transition-colors min-w-0 truncate">
                            {link.title}
                        </span>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-[#0B5858] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"> 
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                    ))}
            </div>
        </>
    );
    };

    export default InventoryDashboardLinks;