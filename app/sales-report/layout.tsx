import React from 'react';

export default function SalesReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div data-sales-report-root>{children}</div>;
}
 