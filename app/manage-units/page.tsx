'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Listing } from '@/types/listing';
import { listUnitsForManage, updateUnit, createUnit, deleteUnit, getUnitById, updateUnitFull } from '@/lib/api/units';
import { useAuth } from '@/contexts/AuthContext';
import NewListingForm, { type NewListingFormPayload } from '@/components/NewListingForms';
import AssignAgentsModal from '@/components/AssignAgentsModal';

/** Custom Dropdown — matches admin pages: rounded-2xl, shadow, click-outside close */
function CustomDropdown({
  value,
  onChange,
  options,
  className = '',
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:border-[#0B5858]/30 hover:bg-gray-50 transition-all shadow-sm"
      >
        <span className="truncate">{selectedOption.label}</span>
        <svg className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-2 w-full min-w-[140px] bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setTimeout(() => setIsOpen(false), 150); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                value === option.value ? 'bg-[#0B5858]/10 text-[#0B5858]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#0B5858] active:bg-[#0B5858]/5'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const ManageUnits: React.FC = () => {
  const router = useRouter();
  const { isAdmin, isAgent, roleLoading } = useAuth();
  const canAccess = isAdmin || isAgent;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [units, setUnits] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingUnits, setTogglingUnits] = useState<Set<string>>(new Set());
  const [togglingFeatured, setTogglingFeatured] = useState<Set<string>>(new Set());
  const [animatingStars, setAnimatingStars] = useState<Set<string>>(new Set());
  const [hoveredText, setHoveredText] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<Listing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalActive, setDeleteModalActive] = useState(false);
  const [pageToast, setPageToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const pageToastRef = useRef<HTMLDivElement | null>(null);
  const [showNewListing, setShowNewListing] = useState(false);
  const [unitToEdit, setUnitToEdit] = useState<Listing | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [unitToAssign, setUnitToAssign] = useState<Listing | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchUnits = useCallback(async () => {
    if (!canAccess) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await listUnitsForManage();
      setUnits(data);
    } catch (err) {
      console.error('Error loading units:', err);
      setError(err instanceof Error ? err.message : 'Failed to load units. Please try again later.');
      setUnits([]);
    } finally {
      setIsLoading(false);
    }
  }, [canAccess]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const openDeleteModal = (unit: Listing) => {
    setUnitToDelete(unit);
    setShowDeleteModal(true);
    requestAnimationFrame(() => setDeleteModalActive(true));
  };

  const closeDeleteModal = () => {
    setDeleteModalActive(false);
    setTimeout(() => {
      setShowDeleteModal(false);
      setUnitToDelete(null);
    }, 250);
  };

  const showToast = (message: string) => {
    setPageToast({ visible: true, message });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = pageToastRef.current;
        if (!el) return;
        el.classList.remove('toast--exit');
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        el.offsetHeight;
        el.classList.add('toast--enter');
      });
    });
    window.setTimeout(() => {
      const el = pageToastRef.current;
      if (!el) return;
      el.classList.remove('toast--enter');
      el.classList.add('toast--exit');
    }, 2200);
  };

  const filteredUnits = useMemo(() => {
    return units.filter(unit => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        unit.title.toLowerCase().includes(searchLower) || 
        unit.id.toLowerCase().includes(searchLower) ||
        (unit.unit_number && unit.unit_number.toLowerCase().includes(searchLower));
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'available' && unit.is_available) ||
                           (statusFilter === 'unavailable' && !unit.is_available);
      const matchesType = typeFilter === 'all' || unit.property_type.toLowerCase() === typeFilter.toLowerCase();
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [units, searchTerm, statusFilter, typeFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter]);

  const totalPages = Math.ceil(filteredUnits.length / itemsPerPage);
  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUnits.slice(start, start + itemsPerPage);
  }, [filteredUnits, currentPage, itemsPerPage]);

  // Get unique property types for filter dropdown
  const propertyTypes = useMemo(() => {
    const types = [...new Set(units.map(u => u.property_type))].filter(Boolean);
    return types.sort();
  }, [units]);

  const formatPrice = (price: number, currency: string) => {
    return `${currency} ${price.toLocaleString()}`;
  };

  const handleCreateListing = async (data: NewListingFormPayload) => {
    try {
      const created = await createUnit(data);
      setUnits(prev => [created, ...prev]);
      setShowNewListing(false);
      showToast('Listing created successfully!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create listing.');
    }
  };

  const handleEditClick = async (unit: Listing) => {
    setIsLoadingEdit(true);
    try {
      const full = await getUnitById(unit.id);
      if (full) {
        setUnitToEdit(full);
      } else {
        showToast('Failed to load unit details.');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load unit.');
    } finally {
      setIsLoadingEdit(false);
    }
  };

  const handleUpdateListing = async (data: NewListingFormPayload) => {
    if (!unitToEdit) return;
    try {
      const updated = await updateUnitFull(unitToEdit.id, data);
      setUnits(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
      setUnitToEdit(null);
      showToast('Listing updated successfully!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update listing.');
    }
  };

  const getCapacityText = (unit: Listing) => {
    const totalGuests = unit.max_capacity ?? unit.bedrooms * 2;
    return `${totalGuests} guest${totalGuests !== 1 ? 's' : ''}`;
  };

  const formatLocation = (unit: Listing): string => {
    const parts: string[] = [];
    if (unit.city && unit.city.trim()) parts.push(unit.city.trim());
    if (unit.country && unit.country.trim()) parts.push(unit.country.trim());
    const cityCountry = parts.join(', ');
    return cityCountry || unit.location || '';
  };

  const formatPropertyType = (rawType: string): string => {
    return rawType
      .split(',')
      .map(part => part.trim())
      .filter(part => part.length > 0)
      .map(part => {
        return part
          .split(/([\s-]+)/)
          .map(token => {
            if (/^[\s-]+$/.test(token)) return token;
            return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
          })
          .join('');
      })
      .join(', ');
  };

  const handleTextHover = (event: React.MouseEvent, text: string) => {
    const element = event.currentTarget as HTMLElement;
    const isOverflowing =
      element.scrollWidth > element.clientWidth ||
      element.scrollHeight > element.clientHeight;

    if (isOverflowing) {
      setHoveredText(text);
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };

  const handleTextLeave = () => {
    setHoveredText(null);
  };

  const toggleAvailability = async (unitId: string, currentStatus: boolean) => {
    try {
      setTogglingUnits(prev => new Set(prev).add(unitId));
      const newStatus = !currentStatus ? 'available' : 'unavailable';
      const result = await updateUnit(unitId, { status: newStatus });
      setUnits(prevUnits =>
        prevUnits.map(unit =>
          unit.id === unitId
            ? { ...unit, is_available: result.is_available ?? newStatus === 'available', updated_at: result.updated_at }
            : unit
        )
      );
    } catch (err) {
      console.error('Error updating availability:', err);
      showToast(err instanceof Error ? err.message : 'Failed to update status. Please try again.');
    } finally {
      setTogglingUnits(prev => {
        const newSet = new Set(prev);
        newSet.delete(unitId);
        return newSet;
      });
    }
  };

  const toggleFeatured = async (unitId: string, currentFeatured: boolean) => {
    try {
      setTogglingFeatured(prev => new Set(prev).add(unitId));
      const newFeatured = !currentFeatured;
      const result = await updateUnit(unitId, { is_featured: newFeatured });
      setUnits(prevUnits =>
        prevUnits.map(unit =>
          unit.id === unitId
            ? { ...unit, is_featured: result.is_featured ?? newFeatured, updated_at: result.updated_at }
            : unit
        )
      );
    } catch (err) {
      console.error('Error updating featured status', err);
      showToast(err instanceof Error ? err.message : 'Failed to update featured status. Please try again.');
    } finally {
      setTogglingFeatured(prev => {
        const next = new Set(prev);
        next.delete(unitId);
        return next;
      });
    }
  };

  const PageSkeleton = () => (
    <>
      {/* Header skeleton */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
          <div>
            <div className="h-7 w-40 bg-gray-200 rounded-lg mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="h-11 w-36 bg-gray-200 rounded-xl"></div>
      </div>

      {/* Search and filters skeleton */}
      <div className="mb-6 animate-pulse">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col md:flex-row gap-3 items-center w-full">
            <div className="relative w-full md:w-80">
              <div className="h-11 bg-gray-200 rounded-2xl"></div>
            </div>
            <div className="w-40">
              <div className="h-11 bg-gray-200 rounded-2xl"></div>
            </div>
            <div className="w-40">
              <div className="h-11 bg-gray-200 rounded-2xl"></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-gray-200 rounded-xl"></div>
            <div className="h-10 w-10 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1200px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['', 'Unit', 'Unit #', 'Location', 'Type', 'Capacity', 'Price', 'Status', 'Bookings', 'Updated', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap first:pl-5 last:pr-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <TableSkeleton />
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <GridSkeleton />
      )}
    </>
  );

  const GridSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden animate-pulse flex flex-col">
          {/* Image skeleton */}
          <div className="relative h-36 bg-gray-200 shrink-0">
            <div className="absolute top-3 left-3 w-7 h-7 bg-gray-300/50 rounded-full"></div>
            <div className="absolute top-3 right-3 w-16 h-5 bg-gray-300/50 rounded-full"></div>
          </div>
          {/* Content skeleton */}
          <div className="p-4 flex flex-col flex-1">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-16 shrink-0"></div>
            </div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="flex items-center gap-4 mb-3">
              <div className="h-3 bg-gray-200 rounded w-12"></div>
              <div className="h-3 bg-gray-200 rounded w-12"></div>
              <div className="h-3 bg-gray-200 rounded w-14"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded-full w-20 mt-auto mb-3"></div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="h-5 w-5 bg-gray-200 rounded"></div>
                <div className="h-5 w-5 bg-gray-200 rounded"></div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-6 w-11 bg-gray-200 rounded-full"></div>
                <div className="h-5 w-5 bg-gray-200 rounded"></div>
                <div className="h-5 w-5 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const TableSkeleton = () => (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="animate-pulse">
          <td className="pl-5 pr-3 py-3 align-middle text-center">
            <div className="h-5 w-5 bg-gray-200 rounded-full mx-auto"></div>
          </td>
          <td className="px-3 py-3 align-middle">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-200 rounded w-40 mb-1"></div>
              </div>
            </div>
          </td>
          <td className="px-3 py-3 align-middle">
            <div className="h-4 bg-gray-200 rounded w-12"></div>
          </td>
          <td className="px-3 py-3 align-middle">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </td>
          <td className="px-3 py-3 align-middle">
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </td>
          <td className="px-3 py-3 align-middle">
            <div className="h-4 bg-gray-200 rounded w-14"></div>
          </td>
          <td className="px-3 py-3 align-middle">
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </td>
          <td className="px-3 py-3 align-middle">
            <div className="h-6 bg-gray-200 rounded-full w-20"></div>
          </td>
          <td className="px-3 py-3 align-middle">
            <div className="h-4 bg-gray-200 rounded w-8"></div>
          </td>
          <td className="px-3 py-3 align-middle">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </td>
          <td className="px-3 pr-5 py-3 align-middle">
            <div className="flex items-center justify-end space-x-2">
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
              <div className="h-6 w-11 bg-gray-200 rounded-full"></div>
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );

  return (
    <div className="min-h-170 bg-gray-50">
      <div className="pt-24 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {(roleLoading || isLoading) ? (
            <PageSkeleton />
          ) : (
            <>
              {/* Page header — matches admin design system */}
              <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.push('/admin')}
                    className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Manage Listings</h1>
                    <p className="text-sm text-gray-500 mt-1">View and manage all property listings on the platform.</p>
                  </div>
                </div>
                {!showNewListing && !unitToEdit && (
                  <button 
                    onClick={() => setShowNewListing(true)}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-[#0B5858] text-white text-sm font-bold rounded-2xl hover:bg-[#094848] hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Listing
                  </button>
                )}
              </div>

              

              {/* Search, filters, view mode — matches admin agents page */}
              {!showNewListing && !unitToEdit && (
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                {/* Search input */}
                <div className="relative flex-1">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, unit number, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] bg-white transition-all shadow-sm"
                  />
                </div>

                {/* Filters and view toggle */}
                <div className="flex gap-3 shrink-0 flex-wrap">
                  <CustomDropdown
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'available', label: 'Available' },
                      { value: 'unavailable', label: 'Unavailable' },
                    ]}
                    className="min-w-[140px]"
                  />
                  <CustomDropdown
                    value={typeFilter}
                    onChange={setTypeFilter}
                    options={[
                      { value: 'all', label: 'All Types' },
                      ...propertyTypes.map(type => ({ value: type.toLowerCase(), label: type.charAt(0).toUpperCase() + type.slice(1) }))
                    ]}
                    className="min-w-[140px]"
                  />

                  {/* View mode toggle — matches admin style */}
                  <div className="flex bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-4 py-3 flex items-center transition-all cursor-pointer ${
                        viewMode === 'list' 
                          ? 'bg-[#0B5858] text-white' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      }`}
                      aria-label="List view"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-4 py-3 flex items-center transition-all cursor-pointer ${
                        viewMode === 'grid' 
                          ? 'bg-[#0B5858] text-white' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      }`}
                      aria-label="Grid view"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              )}

              {(showNewListing || unitToEdit) ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  {unitToEdit ? (
                    <NewListingForm
                      mode="edit"
                      initialListing={unitToEdit}
                      onSubmit={handleUpdateListing}
                      onCancel={() => setUnitToEdit(null)}
                      showToast={showToast}
                    />
                  ) : (
                    <NewListingForm
                      onSubmit={handleCreateListing}
                      onCancel={() => setShowNewListing(false)}
                      showToast={showToast}
                    />
                  )}
                </div>
              ) : viewMode === 'list' ? (
                <>
                {/* Table — matches admin agents page design system: rounded-3xl, header style */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[1200px]">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          {['', 'Unit', 'Unit #', 'Location', 'Type', 'Capacity', 'Price', 'Status', 'Bookings', 'Updated', 'Actions'].map((h) => (
                            <th key={h} className="px-3 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap first:pl-5 last:pr-5">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                        <tbody className="divide-y divide-gray-50">
                        {!canAccess ? (
                          <tr>
                            <td colSpan={11} className="px-7 py-14 text-center">
                              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                              </div>
                              <p className="text-sm font-bold text-gray-500">Access Denied</p>
                              <p className="text-xs font-medium text-gray-400 mt-2">You need Admin or Agent privileges to access this page.</p>
                            </td>
                          </tr>
                        ) : error ? (
                          <tr>
                            <td colSpan={11} className="px-7 py-14 text-center">
                              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                              </div>
                              <p className="text-sm font-bold text-gray-500">Error Loading Units</p>
                              <p className="text-xs font-medium text-gray-400 mt-2">{error}</p>
                            </td>
                          </tr>
                        ) : paginatedUnits.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="px-7 py-14 text-center">
                              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                              <p className="text-sm font-bold text-gray-500">No Listings Found</p>
                              <p className="text-xs font-medium text-gray-400 mt-2">
                                {units.length === 0 ? 'Add your first listing to get started.' : 'No units match your current filters.'}
                              </p>
                              {units.length === 0 && (
                                <button
                                  onClick={() => fetchUnits()}
                                  className="mt-4 px-4 py-2 bg-[#0B5858] text-white text-sm font-bold rounded-xl hover:bg-[#094848] transition-colors cursor-pointer"
                                >
                                  Retry
                                </button>
                              )}
                            </td>
                          </tr>
                        ) : (
                          paginatedUnits.map((unit) => (
                            <tr key={unit.id} className="hover:bg-gray-50/80 transition-colors">
                                <td className="pl-5 pr-3 py-2.5 align-middle text-center">
                                  <button
                                    onClick={() => { 
                                      if (togglingFeatured.has(unit.id)) return; 
                                      setAnimatingStars(prev => new Set(prev).add(unit.id));
                                      setTimeout(() => setAnimatingStars(prev => {
                                        const next = new Set(prev);
                                        next.delete(unit.id);
                                        return next;
                                      }), 400);
                                      toggleFeatured(unit.id, !!unit.is_featured); 
                                    }}
                                    className={`cursor-pointer p-1.5 rounded-full transition-all duration-200 ${
                                      unit.is_featured 
                                        ? 'bg-gradient-to-br from-amber-100 to-yellow-50 shadow-sm' 
                                        : 'hover:bg-gray-100'
                                    }`}
                                    aria-label="Toggle featured"
                                    title={unit.is_featured ? 'Unmark as featured' : 'Mark as featured'}
                                    style={{ 
                                      boxShadow: unit.is_featured 
                                        ? '0 2px 8px rgba(246, 214, 88, 0.4), inset 0 1px 0 rgba(255,255,255,0.8)' 
                                        : 'none'
                                    }}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      width="20"
                                      height="20"
                                      className={`transition-all duration-300 ${animatingStars.has(unit.id) ? 'star-click-animation' : ''}`}
                                      style={{ 
                                        filter: unit.is_featured 
                                          ? 'drop-shadow(0 1px 2px rgba(180, 140, 20, 0.5))' 
                                          : 'none'
                                      }}
                                    >
                                      <defs>
                                        <linearGradient id={`starGradient-${unit.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                          <stop offset="0%" stopColor="#F6D658" />
                                          <stop offset="50%" stopColor="#F5C842" />
                                          <stop offset="100%" stopColor="#D4A828" />
                                        </linearGradient>
                                      </defs>
                                      <path 
                                        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                        fill={unit.is_featured ? `url(#starGradient-${unit.id})` : 'none'}
                                        stroke={unit.is_featured ? '#C9A227' : '#9CA3AF'}
                                        strokeWidth={unit.is_featured ? '1' : '1.5'}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </button>
                                </td>
                                <td className="px-3 py-2.5 align-middle">
                                  <div className="flex items-center space-x-3">
                                    <img 
                                      src={unit.main_image_url || '/avida.jpg'} 
                                      alt={unit.title}
                                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div 
                                        className="text-sm font-medium text-gray-900 cursor-default leading-snug" 
                                        style={{
                                          fontFamily: 'Poppins',
                                          display: '-webkit-box',
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: 'vertical',
                                          overflow: 'hidden',
                                          maxWidth: '280px'
                                        } as React.CSSProperties & { WebkitLineClamp: number; WebkitBoxOrient: string }}
                                        onMouseEnter={(e) => handleTextHover(e, unit.title)}
                                        onMouseLeave={handleTextLeave}
                                      >
                                        {unit.title}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-3 py-2.5 align-middle">
                                  <span className="text-gray-900 text-sm" style={{fontFamily: 'Poppins'}}>
                                    {unit.unit_number || '—'}
                                  </span>
                                </td>

                                <td className="px-3 py-2.5 align-middle">
                                  <span 
                                    className="text-gray-900 text-sm cursor-default leading-snug" 
                                    style={{
                                      fontFamily: 'Poppins',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden'
                                    } as React.CSSProperties & { WebkitLineClamp: number; WebkitBoxOrient: string }}
                                    onMouseEnter={(e) => handleTextHover(e, formatLocation(unit))}
                                    onMouseLeave={handleTextLeave}
                                  >
                                    {formatLocation(unit)}
                                  </span>
                                </td>

                                <td className="px-3 py-2.5 align-middle">
                                  <span 
                                    className="text-gray-900 text-sm cursor-default" 
                                    style={{fontFamily: 'Poppins'}}
                                    onMouseEnter={(e) => handleTextHover(e, formatPropertyType(unit.property_type))}
                                    onMouseLeave={handleTextLeave}
                                  >
                                    {formatPropertyType(unit.property_type)}
                                  </span>
                                </td>

                                <td className="px-3 py-2.5 align-middle">
                                  <span className="text-gray-900 text-sm" style={{fontFamily: 'Poppins'}}>
                                    {getCapacityText(unit)}
                                  </span>
                                </td>

                                <td className="px-3 py-2.5 align-middle">
                                  <span 
                                    className="text-gray-900 text-sm font-medium cursor-default" 
                                    style={{fontFamily: 'Poppins'}}
                                    onMouseEnter={(e) => handleTextHover(e, formatPrice(unit.price, unit.currency))}
                                    onMouseLeave={handleTextLeave}
                                  >
                                    {formatPrice(unit.price, unit.currency)}
                                  </span>
                                </td>

                                <td className="px-3 py-2.5 align-middle">
                                  <span 
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium chip-shadow whitespace-nowrap"
                                    style={{
                                      backgroundColor: unit.is_available ? 'rgba(11, 88, 88, 0.12)' : 'rgba(184, 76, 76, 0.12)',
                                      color: unit.is_available ? '#0B5858' : '#B84C4C',
                                      fontFamily: 'Poppins',
                                      boxShadow: unit.is_available 
                                        ? '0 1px 0 rgba(11, 88, 88, 0.25), 0 2px 4px rgba(11, 88, 88, 0.1)'
                                        : '0 1px 0 rgba(184, 76, 76, 0.25), 0 2px 4px rgba(184, 76, 76, 0.1)'
                                    }}
                                  >
                                    <span 
                                      className="w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ backgroundColor: unit.is_available ? '#0B5858' : '#B84C4C' }}
                                    />
                                    {unit.is_available ? 'Available' : 'Unavailable'}
                                  </span>
                                </td>

                                <td className="px-3 py-2.5 align-middle">
                                  <span className="text-gray-900 text-sm" style={{fontFamily: 'Poppins'}}>
                                    {unit.bookings_count ?? 0}
                                  </span>
                                </td>

                                <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                                  <span className="text-gray-900 text-sm whitespace-nowrap" style={{fontFamily: 'Poppins'}}>
                                    {new Date(unit.updated_at).toLocaleDateString()}
                                  </span>
                                </td>

                                <td className="px-3 py-2.5 align-middle">
                                  <div className="flex items-center justify-end space-x-2">
                                    <button 
                                      onClick={() => router.push(`/unit-calendar/${unit.id}`)}
                                      className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                      title="View Calendar"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </button>

                                    <button 
                                      onClick={() => { setUnitToAssign(unit); setShowAssignModal(true); }}
                                      className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                      title="Assign Agents"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                      </svg>
                                    </button>

                                    <button 
                                      onClick={() => toggleAvailability(unit.id, unit.is_available)}
                                      disabled={togglingUnits.has(unit.id)}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                        unit.is_available 
                                          ? 'focus:ring-gray-500 hover:opacity-80' 
                                          : 'bg-gray-200 focus:ring-gray-500 hover:bg-gray-300'
                                      }`}
                                      style={{ backgroundColor: unit.is_available ? '#558B8B' : undefined }}
                                      title={unit.is_available ? 'Mark as Unavailable' : 'Mark as Available'}
                                    >
                                      {togglingUnits.has(unit.id) ? (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                        </div>
                                      ) : (
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                          unit.is_available ? 'translate-x-6' : 'translate-x-1'
                                        }`} />
                                      )}
                                    </button>
                                    
                                    <button 
                                      className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer" 
                                      onClick={(e) => { e.stopPropagation(); handleEditClick(unit); }} 
                                      disabled={isLoadingEdit}
                                      title="Edit Unit"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    
                                    {isAdmin && (
                                    <button 
                                      className="text-gray-400 transition-colors cursor-pointer" 
                                      onMouseEnter={(e) => e.currentTarget.style.color = '#B84C4C'} 
                                      onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
                                      onClick={() => openDeleteModal(unit)}
                                      title="Delete Unit"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                    </table>
                  </div>

                  {/* Pagination — matches admin agents page */}
                  <div className="flex flex-col sm:flex-row items-center justify-between px-7 py-4 border-t border-gray-100 bg-white gap-4">
                    <p className="text-xs font-medium text-gray-500">
                      Showing <span className="font-medium text-gray-900">{filteredUnits.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filteredUnits.length)}</span> of <span className="font-medium text-gray-900">{filteredUnits.length}</span> results
                    </p>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="inline-flex items-center justify-center p-2 rounded-xl border border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all duration-200 group active:scale-95 cursor-pointer"
                          aria-label="Previous page"
                        >
                          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
                          </svg>
                        </button>
                        <div className="flex items-center gap-1 px-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum = i + 1;
                            if (totalPages > 5) {
                              if (currentPage > 3 && currentPage < totalPages - 1) {
                                pageNum = currentPage - 2 + i;
                              } else if (currentPage >= totalPages - 1) {
                                pageNum = totalPages - 4 + i;
                              }
                            }
                            const isActive = currentPage === pageNum;
                            return (
                              <button
                                key={pageNum}
                                type="button"
                                onClick={() => setCurrentPage(pageNum)}
                                className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-[13px] font-bold transition-all duration-300 cursor-pointer ${
                                  isActive ? 'bg-[#0B5858] text-white shadow-md shadow-[#0B5858]/30 scale-105' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 active:scale-95'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="inline-flex items-center justify-center p-2 rounded-xl border border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all duration-200 group active:scale-95 cursor-pointer"
                          aria-label="Next page"
                        >
                          <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                </>
              ) : (
                <>
                  {!canAccess ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="text-red-500">
                        <svg className="w-20 h-20 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <h3 className="text-xl font-semibold mb-3" style={{fontFamily: 'Poppins'}}>
                          Access Denied
                        </h3>
                        <p className="text-gray-600 text-center" style={{fontFamily: 'Poppins'}}>
                          You need Admin or Agent privileges to access the Manage Units page.
                        </p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="text-red-500">
                        <svg className="w-20 h-20 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <h3 className="text-xl font-semibold mb-3" style={{fontFamily: 'Poppins'}}>
                          Error Loading Units
                        </h3>
                        <p className="text-gray-600 text-center" style={{fontFamily: 'Poppins'}}>
                          {error}
                        </p>
                      </div>
                    </div>
                  ) : filteredUnits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="text-gray-500">
                        <svg className="w-20 h-20 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <h3 className="text-xl font-semibold mb-3" style={{fontFamily: 'Poppins', fontWeight: 600}}>
                          No Units Found
                        </h3>
                        <p className="text-gray-600 text-center" style={{fontFamily: 'Poppins', fontWeight: 400}}>
                          {units.length === 0 ? 'No units available. Add your first listing!' : 'No units match your current filters.'}
                        </p>
                        {units.length === 0 && (
                          <button
                            onClick={() => fetchUnits()}
                            className="mt-4 inline-flex items-center px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all duration-300 hover:opacity-90 cursor-pointer"
                            style={{ backgroundColor: '#0B5858', fontFamily: 'Poppins' }}
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {paginatedUnits.map((unit) => (
                        <div
                          key={unit.id}
                          className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col"
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            const isClickableElement = target.closest('button, a, [role="button"]');
                            if (!isClickableElement) {
                              router.push(`/unit/${unit.id}`);
                            }
                          }}
                        >
                          <div className="relative h-36 overflow-hidden bg-gray-200 shrink-0">
                            <img
                              src={unit.main_image_url || '/avida.jpg'}
                              alt={unit.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (target.src.includes('/avida.jpg')) {
                                  target.src = '/heroimage.png';
                                } else if (target.src.includes('/heroimage.png')) {
                                  target.src = '/avida.webp';
                                }
                              }}
                            />
                            <div className="absolute top-3 left-3">
                              <button
                                onClick={() => { 
                                  if (togglingFeatured.has(unit.id)) return; 
                                  setAnimatingStars(prev => new Set(prev).add(unit.id));
                                  setTimeout(() => setAnimatingStars(prev => {
                                    const next = new Set(prev);
                                    next.delete(unit.id);
                                    return next;
                                  }), 400);
                                  toggleFeatured(unit.id, !!unit.is_featured); 
                                }}
                                className="cursor-pointer p-1.5 rounded-full transition-all duration-200"
                                aria-label="Toggle featured"
                                title={unit.is_featured ? 'Unmark as featured' : 'Mark as featured'}
                                style={{ 
                                  backgroundColor: unit.is_featured ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.5)',
                                  backdropFilter: 'blur(8px)',
                                  WebkitBackdropFilter: 'blur(8px)',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  width="16"
                                  height="16"
                                  className={`transition-all duration-300 ${animatingStars.has(unit.id) ? 'star-click-animation' : ''}`}
                                  style={{ 
                                    filter: unit.is_featured 
                                      ? 'drop-shadow(0 1px 1px rgba(180, 140, 20, 0.5))' 
                                      : 'none'
                                  }}
                                >
                                  <defs>
                                    <linearGradient id={`cardStarGradient-${unit.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor="#F6D658" />
                                      <stop offset="50%" stopColor="#F5C842" />
                                      <stop offset="100%" stopColor="#D4A828" />
                                    </linearGradient>
                                  </defs>
                                  <path 
                                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                    fill={unit.is_featured ? `url(#cardStarGradient-${unit.id})` : 'none'}
                                    stroke={unit.is_featured ? '#C9A227' : '#9CA3AF'}
                                    strokeWidth={unit.is_featured ? '1' : '1.5'}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                            </div>
                            <div className="absolute top-3 right-3">
                              <span
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium"
                                style={{
                                  backgroundColor: unit.is_available 
                                    ? 'rgba(11, 88, 88, 0.75)' 
                                    : 'rgba(184, 76, 76, 0.75)',
                                  color: '#ffffff',
                                  fontFamily: 'Poppins',
                                  backdropFilter: 'blur(8px)',
                                  WebkitBackdropFilter: 'blur(8px)',
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                                }}
                              >
                                <span 
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: unit.is_available ? '#86EFAC' : '#FCA5A5' }}
                                />
                                {unit.is_available ? 'Available' : 'Unavailable'}
                              </span>
                            </div>
                          </div>
                          <div className="p-4 flex flex-col h-full">
                            {/* Header: Title + Price */}
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug flex-1" style={{fontFamily: 'Poppins'}} title={unit.title}>
                                {unit.title}
                              </h3>
                              <span className="text-base font-bold text-gray-900 shrink-0" style={{fontFamily: 'Poppins'}}>
                                ₱{unit.price.toLocaleString()}
                              </span>
                            </div>
                            
                            {/* Location */}
                            <p className="text-xs text-gray-500 mt-0.5 mb-3 line-clamp-1" style={{fontFamily: 'Poppins'}}>
                              {formatLocation(unit)}
                            </p>

                            {/* Specs with icons */}
                            <div className="flex items-center gap-4 text-xs text-gray-600 mb-3" style={{fontFamily: 'Poppins'}}>
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                <span>{unit.bedrooms} {unit.bedrooms === 1 ? 'Bed' : 'Beds'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                                </svg>
                                <span>{unit.bathrooms} {unit.bathrooms === 1 ? 'Bath' : 'Baths'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span>{unit.max_capacity ?? unit.bedrooms * 2} Guests</span>
                              </div>
                            </div>

                            {/* Property Type Badge - above divider */}
                            <div className="mt-auto pb-3">
                              <span 
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium chip-shadow whitespace-nowrap"
                                style={{
                                  backgroundColor: 'rgba(11, 88, 88, 0.12)',
                                  color: '#0B5858',
                                  fontFamily: 'Poppins',
                                  boxShadow: '0 1px 0 rgba(11, 88, 88, 0.25), 0 2px 4px rgba(11, 88, 88, 0.1)'
                                }}
                              >
                                {formatPropertyType(unit.property_type)}
                              </span>
                            </div>

                            {/* Footer: Actions - matching table design */}
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                              {/* Left: View & Assign icons */}
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/unit-calendar/${unit.id}`);
                                  }}
                                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                  title="View Calendar"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUnitToAssign(unit);
                                    setShowAssignModal(true);
                                  }}
                                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                  title="Assign Agents"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                  </svg>
                                </button>
                              </div>

                              {/* Right: Toggle, Edit, Delete */}
                              <div className="flex items-center space-x-2">
                                {/* Availability toggle - same as table */}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); toggleAvailability(unit.id, unit.is_available); }}
                                  disabled={togglingUnits.has(unit.id)}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                    unit.is_available 
                                      ? 'focus:ring-gray-500 hover:opacity-80' 
                                      : 'bg-gray-200 focus:ring-gray-500 hover:bg-gray-300'
                                  }`}
                                  style={{ backgroundColor: unit.is_available ? '#558B8B' : undefined }}
                                  title={unit.is_available ? 'Mark as Unavailable' : 'Mark as Available'}
                                >
                                  {togglingUnits.has(unit.id) ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                                    </div>
                                  ) : (
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      unit.is_available ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                  )}
                                </button>

                                {/* Edit button - same as table */}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleEditClick(unit); }}
                                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                  title="Edit Unit"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>

                                {/* Delete button - same as table */}
                                {isAdmin && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); openDeleteModal(unit); }}
                                    className="text-gray-400 transition-colors cursor-pointer"
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#B84C4C'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
                                    title="Delete Unit"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>


      {showDeleteModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[10000] modal-backdrop"
          style={{
            backgroundColor: 'rgba(17, 24, 39, 0.38)',
            transition: 'background-color 0.25s ease'
          }}
          onClick={closeDeleteModal}
        >
          <div 
            className={`modal-content ${deleteModalActive ? 'show' : ''} max-w-md w-full mx-4`}
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
              transform: deleteModalActive ? 'scale(1)' : 'scale(0.95)',
              opacity: deleteModalActive ? 1 : 0,
              transition: 'all 0.25s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2" style={{fontFamily: 'Poppins'}}>Delete Listing</h3>
              <p className="text-gray-700 mb-5" style={{fontFamily: 'Poppins'}}>
                Are you sure you want to delete <span className="font-semibold">{unitToDelete?.title}</span>? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  style={{fontFamily: 'Poppins'}}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!unitToDelete) return;
                    setIsDeleting(true);
                    try {
                      await deleteUnit(unitToDelete.id);
                      setUnits(prev => prev.filter(u => u.id !== unitToDelete.id));
                      setShowDeleteModal(false);
                      setUnitToDelete(null);
                      showToast('Listing deleted.');
                      setTimeout(() => window.scrollTo(0, 0), 0);
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : 'Failed to delete listing.';
                      showToast(msg);
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  disabled={isDeleting}
                  className="px-4 py-2 text-white rounded-lg transition-colors hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{backgroundColor: '#B84C4C', fontFamily: 'Poppins'}}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {unitToAssign && (
        <AssignAgentsModal
          isOpen={showAssignModal}
          onClose={() => { setShowAssignModal(false); setUnitToAssign(null); }}
          unitId={unitToAssign.id}
          unitTitle={unitToAssign.title}
          assignedAgents={unitToAssign.assigned_agents || []}
          onSaved={(agents) => {
            setUnits(prev => prev.map(u =>
              u.id === unitToAssign.id ? { ...u, assigned_agents: agents } : u
            ));
            showToast('Agents updated.');
          }}
        />
      )}

      {hoveredText && (
        <div
          className="fixed z-50 px-3 py-2 text-sm text-white rounded-lg shadow-lg pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 40,
            backgroundColor: '#558B8B',
            fontFamily: 'Poppins',
            maxWidth: '300px',
            wordWrap: 'break-word'
          }}
        >
          {hoveredText}
          <div
            className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
            style={{ borderTopColor: '#558B8B' }}
          />
        </div>
      )}

      {pageToast.visible && (
        <div className="fixed right-0 top-24 pr-6 z-[2000] pointer-events-none">
          <div
            ref={pageToastRef}
            className="toast-base px-4 py-3 rounded-lg pointer-events-auto"
            style={{
              backgroundColor: '#FFFFFF',
              color: '#0B5858',
              fontFamily: 'Poppins',
              boxShadow: '0 18px 44px rgba(0, 0, 0, 0.18)',
              borderLeft: '6px solid #0B5858'
            }}
            onTransitionEnd={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              if (el.classList.contains('toast--exit')) {
                setPageToast({ visible: false, message: '' });
                el.classList.remove('toast--exit');
              }
            }}
          >
            {pageToast.message}
          </div>
        </div>
      )}

      <style>{`
        .toast-base { transform: translateX(100%); opacity: 0; transition: transform .28s ease-out, opacity .28s ease-out; will-change: transform, opacity; }
        .toast--enter { transform: translateX(0); opacity: 1; }
        .toast--exit { transform: translateX(100%); opacity: 0; }
      `}</style>
    </div>
  );
};

export default ManageUnits;