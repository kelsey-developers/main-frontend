'use client';

import React from 'react';
import Link from 'next/link';
import type { InventoryFeatureLink } from '../types';

const FEATURE_LINKS: InventoryFeatureLink[] = [
    { href: '/sales-report/inventory/purchase-orders', title: 'Purchase Orders', icon: 'purchaseOrders' },
    { href: '/sales-report/inventory/items', title: 'Inventory items', icon: 'items' },
    { href: '/sales-report/inventory/damage-reports', title: 'Damage Reports', icon: 'damageReports' },
    { href: '/sales-report/inventory/suppliers', title: 'Supplier Directory', icon: 'suppliers' },
    { href: '/sales-report/inventory/warehouses', title: 'Warehouse Directory', icon: 'warehouses' },
    { href: '/sales-report/inventory/stock-movements', title: 'Stock Movement History', icon: 'stockMovements' },
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
        case 'suppliers':
            return (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            );
        case 'warehouses':
            return (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V10z" />
                </svg>
            );
        case 'purchaseOrders':
            return (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M8 4h8a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" />
                </svg>
            );
        case 'stockMovements':
            return (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            );
        case 'damageReports':
            return (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
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