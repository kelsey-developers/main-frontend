import React from 'react';

export default function InventoryTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        @keyframes inventoryPageEnter {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .inventory-page-transition {
          animation: inventoryPageEnter 320ms cubic-bezier(0.2, 0.75, 0.15, 1) both;
          will-change: opacity;
        }

        @media (prefers-reduced-motion: reduce) {
          .inventory-page-transition {
            animation: none;
          }
        }
      `}</style>

      <div className="inventory-page-transition">{children}</div>
    </>
  );
}
