'use client';

import React, { useState, useRef } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

// Icon components
const QuestionIcon = () => (
  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
  </svg>
);

const CreditCardIcon = () => (
  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
  </svg>
);

const ListIcon = () => (
  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0-8h14V7H7v2z"/>
  </svg>
);

const HeadsetIcon = () => (
  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h4v1h-7v2h6c1.66 0 3-1.34 3-3V10c0-4.97-4.03-9-9-9z"/>
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const InfoIcon = () => (
  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
  </svg>
);

const EmailIcon = () => (
  <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const PhoneIcon = () => (
  <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
  </svg>
);

interface FAQItem {
  question: string;
  answer: string;
}

type TicketCategory = 
  | 'Billing & Payments'
  | 'Technical Support'
  | 'Bug Report'
  | 'Feature Request'
  | 'Account Issues'
  | 'General Inquiry'
  | 'Sales Question'
  | 'Emergency/Critical Issue';

type PriorityLevel = 'Low' | 'Normal' | 'High' | 'Critical';

interface TicketFormData {
  email: string;
  subject: string;
  category: TicketCategory | '';
  priority: PriorityLevel;
  description: string;
  productService: string;
  orderAccountNumber: string;
  attachments: File[];
}

const HelpAndSupport: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  
  // Ticket form state
  const [formData, setFormData] = useState<TicketFormData>({
    email: '',
    subject: '',
    category: '',
    priority: 'Normal',
    description: '',
    productService: '',
    orderAccountNumber: '',
    attachments: []
  });
  
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof TicketFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const MAX_SUBJECT_LENGTH = 100;
  const MAX_DESCRIPTION_LENGTH = 5000;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const MAX_ATTACHMENTS = 5;

  const faqItems: FAQItem[] = [
    {
      question: 'How do I manage a booking?',
      answer: 'You can manage your bookings through the booking dashboard. From there, you can view details, modify dates, and cancel if needed.'
    },
    {
      question: 'What is the cancellation policy?',
      answer: 'Cancellations made more than 48 hours before check-in receive a full refund. Cancellations within 48 hours are subject to a 50% fee.'
    },
    {
      question: 'How do guest issues get resolved?',
      answer: 'Guest issues are handled by our support team. Contact us via email or phone, and we will assist you promptly to resolve any concerns.'
    },
    {
      question: 'What are the check-in and check-out times?',
      answer: 'Check-in is available from 3:00 PM onwards, and check-out is before 11:00 AM. Early check-in or late check-out may be available upon request.'
    }
  ];

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
  };

  // Validate file before adding
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" exceeds the maximum size of 10MB.`;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `File "${file.name}" is not a supported file type. Allowed types: images (JPEG, PNG, GIF, WebP), PDF, or documents (TXT, DOC, DOCX).`;
    }
    return null;
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const errors: string[] = [];
    const validFiles: File[] = [];

    // Check total file count
    if (formData.attachments.length + files.length > MAX_ATTACHMENTS) {
      setSubmitError(`You can only attach up to ${MAX_ATTACHMENTS} files total.`);
      return;
    }

    files.forEach((file: File) => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setSubmitError(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setFormData((prev: TicketFormData) => ({
        ...prev,
        attachments: [...prev.attachments, ...validFiles]
      }));
      setSubmitError(null);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (index: number) => {
    setFormData((prev: TicketFormData) => ({
      ...prev,
      attachments: prev.attachments.filter((_: File, i: number) => i !== index)
    }));
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Handle form field changes
  const handleFieldChange = (field: keyof TicketFormData, value: string | PriorityLevel | TicketCategory | File[]) => {
    setFormData((prev: TicketFormData) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev: Partial<Record<keyof TicketFormData, string>>) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    setSubmitError(null);
  };

  // Progressive disclosure: Show priority for critical categories
  const shouldShowPriority = (category: TicketCategory | ''): boolean => {
    return category === 'Emergency/Critical Issue' || 
           category === 'Bug Report' || 
           category === 'Technical Support' ||
           category === 'Billing & Payments';
  };

  // Progressive disclosure: Show product/service for relevant categories
  const shouldShowProductService = (category: TicketCategory | ''): boolean => {
    return category === 'Bug Report' || 
           category === 'Feature Request' || 
           category === 'Technical Support' ||
           category === 'Sales Question';
  };

  // Progressive disclosure: Show order/account for relevant categories
  const shouldShowOrderAccount = (category: TicketCategory | ''): boolean => {
    return category === 'Billing & Payments' || 
           category === 'Account Issues' ||
           category === 'Bug Report';
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof TicketFormData, string>> = {};

    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address (e.g., yourname@gmail.com).';
    }

    if (!formData.subject.trim()) {
      errors.subject = 'Subject line is required.';
    } else if (formData.subject.length > MAX_SUBJECT_LENGTH) {
      errors.subject = `Subject line cannot exceed ${MAX_SUBJECT_LENGTH} characters.`;
    }

    if (!formData.category) {
      errors.category = 'Please select a category.';
    }

    if (!formData.description.trim()) {
      errors.description = 'Please provide a detailed description of your issue.';
    } else if (formData.description.length < 20) {
      errors.description = 'Description must be at least 20 characters. Please provide more details.';
    } else if (formData.description.length > MAX_DESCRIPTION_LENGTH) {
      errors.description = `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(formErrors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element?.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare form data for submission
      const ticketData = {
        email: formData.email,
        subject: formData.subject,
        category: formData.category,
        priority: formData.priority,
        description: formData.description,
        productService: formData.productService || undefined,
        orderAccountNumber: formData.orderAccountNumber || undefined,
        attachmentCount: formData.attachments.length,
        submittedAt: new Date().toISOString()
      };

      console.log('Ticket submitted:', ticketData);
      console.log('Attachments:', formData.attachments.map((f: File) => ({ name: f.name, size: f.size, type: f.type })));

      // Submit ticket to API endpoint
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData)
      });

      if (!response.ok) {
        throw new Error('Failed to submit ticket');
      }

      setSubmitSuccess(true);
      
      // Reset form after success
      setTimeout(() => {
        setFormData({
          email: '',
          subject: '',
          category: '',
          priority: 'Normal',
          description: '',
          productService: '',
          orderAccountNumber: '',
          attachments: []
        });
        setSubmitSuccess(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3000);

    } catch (error) {
      console.error('Error submitting ticket:', error);
      setSubmitError('Failed to submit ticket. Please try again or contact support directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-20 sm:pt-24 pb-8 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4"
            style={{ color: '#1F2937', fontFamily: 'Poppins' }}
          >
            How can we help you?
          </h1>
          <p 
            className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 px-2"
            style={{ fontFamily: 'Poppins' }}
          >
            Find answers to your questions, step-by-step guides, and contact information.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8 sm:mb-16">
          <div className="relative">
            <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search for topics or questions..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 text-sm sm:text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300"
              style={{
                fontFamily: 'Poppins',
                '--tw-ring-color': '#549F74',
              } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Left Column */}
          <div className="space-y-6 sm:space-y-8">
            {/* FAQ Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#D4E9DC' }}>
                  <QuestionIcon />
                </div>
                <h2 
                  className="text-lg sm:text-xl md:text-2xl font-bold"
                  style={{ color: '#1F2937', fontFamily: 'Poppins' }}
                >
                  Frequently Asked Questions
                </h2>
              </div>
              <div className="space-y-3">
                {faqItems.map((item, index) => (
                  <div key={index} className="border-b border-gray-200 last:border-b-0 pb-3 last:pb-0">
                    <button
                      onClick={() => toggleFAQ(index)}
                      className="w-full flex items-center justify-between text-left py-2 hover:text-gray-900 transition-colors"
                      style={{ fontFamily: 'Poppins' }}
                    >
                      <span className="text-gray-700 font-medium pr-2 sm:pr-4 text-sm sm:text-base">{item.question}</span>
                      <span className={`transform transition-transform flex-shrink-0 ${expandedFAQ === index ? 'rotate-180' : ''}`}>
                        <ChevronDownIcon />
                      </span>
                    </button>
                    {expandedFAQ === index && (
                      <div 
                        className="mt-2 text-gray-600 pl-0 text-sm sm:text-base"
                        style={{ fontFamily: 'Poppins' }}
                      >
                        {item.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Methods Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#D4E9DC' }}>
                  <CreditCardIcon />
                </div>
                <h2 
                  className="text-lg sm:text-xl md:text-2xl font-bold"
                  style={{ color: '#1F2937', fontFamily: 'Poppins' }}
                >
                  Payment Methods
                </h2>
              </div>
              <p 
                className="text-sm sm:text-base text-gray-600 mb-4"
                style={{ fontFamily: 'Poppins' }}
              >
                We are continuously working to expand our payment options to provide more flexibility for you and your clients.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
                <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <InfoIcon />
                </div>
                <p 
                  className="text-sm sm:text-base text-gray-800 font-medium"
                  style={{ fontFamily: 'Poppins' }}
                >
                  Important: Cash only for now
                </p>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6 sm:space-y-8">
            {/* How to Book Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#D4E9DC' }}>
                  <ListIcon />
                </div>
                <h2 
                  className="text-lg sm:text-xl md:text-2xl font-bold"
                  style={{ color: '#1F2937', fontFamily: 'Poppins' }}
                >
                  How to Book
                </h2>
              </div>
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 text-sm sm:text-base" style={{ backgroundColor: '#0B5858' }}>
                    <span className="font-semibold" style={{ fontFamily: 'Poppins' }}>1</span>
                  </div>
                  <div>
                    <h3 
                      className="text-sm sm:text-base font-semibold mb-1"
                      style={{ color: '#1F2937', fontFamily: 'Poppins' }}
                    >
                      Search for Availability
                    </h3>
                    <p 
                      className="text-xs sm:text-sm text-gray-600"
                      style={{ fontFamily: 'Poppins' }}
                    >
                      Use the main dashboard to enter dates and location to find available homestays.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 text-sm sm:text-base" style={{ backgroundColor: '#0B5858' }}>
                    <span className="font-semibold" style={{ fontFamily: 'Poppins' }}>2</span>
                  </div>
                  <div>
                    <h3 
                      className="text-sm sm:text-base font-semibold mb-1"
                      style={{ color: '#1F2937', fontFamily: 'Poppins' }}
                    >
                      Fill Guest Details
                    </h3>
                    <p 
                      className="text-xs sm:text-sm text-gray-600"
                      style={{ fontFamily: 'Poppins' }}
                    >
                      Enter all required information for the primary guest and any additional occupants.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 text-sm sm:text-base" style={{ backgroundColor: '#0B5858' }}>
                    <span className="font-semibold" style={{ fontFamily: 'Poppins' }}>3</span>
                  </div>
                  <div>
                    <h3 
                      className="text-sm sm:text-base font-semibold mb-1"
                      style={{ color: '#1F2937', fontFamily: 'Poppins' }}
                    >
                      Confirm Payment Method
                    </h3>
                    <p 
                      className="text-xs sm:text-sm text-gray-600"
                      style={{ fontFamily: 'Poppins' }}
                    >
                      Review the payment details and confirm the booking. An email confirmation will be sent.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Support Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#D4E9DC' }}>
                  <HeadsetIcon />
                </div>
                <h2 
                  className="text-lg sm:text-xl md:text-2xl font-bold"
                  style={{ color: '#1F2937', fontFamily: 'Poppins' }}
                >
                  Contact Support
                </h2>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <EmailIcon />
                  <a 
                    href="mailto:support@kelsey.homestay"
                    className="text-sm sm:text-base font-medium hover:underline break-all"
                    style={{ color: '#0B5858', fontFamily: 'Poppins' }}
                  >
                    support@kelsey.homestay
                  </a>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <PhoneIcon />
                  <span 
                    className="text-sm sm:text-base text-gray-800"
                    style={{ fontFamily: 'Poppins' }}
                  >
                    +1 (555) 123-4567 (9am-5pm EST)
                  </span>
                </div>
              </div>
            </div>

            {/* Submit a Ticket Form */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <h3 
                className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-center"
                style={{ color: '#1F2937', fontFamily: 'Poppins' }}
              >
                Submit a Ticket
              </h3>

              {/* Success Message */}
              {submitSuccess && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg animate-slideDown">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-green-800" style={{ fontFamily: 'Poppins' }}>
                        Ticket submitted successfully!
                      </p>
                      <p className="text-sm text-green-700 mt-1" style={{ fontFamily: 'Poppins' }}>
                        We've received your request and will get back to you soon. A confirmation email has been sent to {formData.email}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {submitError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-slideDown">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-800 whitespace-pre-line" style={{ fontFamily: 'Poppins' }}>
                      {submitError}
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitTicket} className="space-y-4 sm:space-y-5" noValidate>
                {/* Email Address */}
                <div>
                  <label htmlFor="email" className="block mb-1.5 text-sm font-medium" style={{ color: '#1F2937', fontFamily: 'Poppins' }}>
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('email', e.target.value)}
                    placeholder="yourname@example.com"
                    required
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 ${
                      formErrors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    style={{
                      fontFamily: 'Poppins',
                      '--tw-ring-color': formErrors.email ? '#ef4444' : '#549F74',
                    } as React.CSSProperties}
                    aria-invalid={!!formErrors.email}
                    aria-describedby={formErrors.email ? 'email-error' : undefined}
                  />
                  {formErrors.email && (
                    <p id="email-error" className="mt-1 text-xs text-red-600" style={{ fontFamily: 'Poppins' }}>
                      {formErrors.email}
                    </p>
                  )}
                </div>

                {/* Subject Line */}
                <div>
                  <label htmlFor="subject" className="block mb-1.5 text-sm font-medium" style={{ color: '#1F2937', fontFamily: 'Poppins' }}>
                    Subject <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      ({formData.subject.length}/{MAX_SUBJECT_LENGTH} characters)
                    </span>
                  </label>
                  <input
                    id="subject"
                    type="text"
                    value={formData.subject}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = e.target.value.slice(0, MAX_SUBJECT_LENGTH);
                      handleFieldChange('subject', value);
                    }}
                    placeholder="Brief summary of your issue"
                    required
                    maxLength={MAX_SUBJECT_LENGTH}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 ${
                      formErrors.subject ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    style={{
                      fontFamily: 'Poppins',
                      '--tw-ring-color': formErrors.subject ? '#ef4444' : '#549F74',
                    } as React.CSSProperties}
                    aria-invalid={!!formErrors.subject}
                    aria-describedby={formErrors.subject ? 'subject-error' : undefined}
                  />
                  {formErrors.subject && (
                    <p id="subject-error" className="mt-1 text-xs text-red-600" style={{ fontFamily: 'Poppins' }}>
                      {formErrors.subject}
                    </p>
                  )}
                </div>

                {/* Category Selection */}
                <div>
                  <label htmlFor="category" className="block mb-1.5 text-sm font-medium" style={{ color: '#1F2937', fontFamily: 'Poppins' }}>
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFieldChange('category', e.target.value as TicketCategory)}
                    required
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 appearance-none ${
                      formErrors.category ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    style={{
                      fontFamily: 'Poppins',
                      '--tw-ring-color': formErrors.category ? '#ef4444' : '#549F74',
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem'
                    } as React.CSSProperties}
                    aria-invalid={!!formErrors.category}
                    aria-describedby={formErrors.category ? 'category-error' : undefined}
                  >
                    <option value="">Select a category...</option>
                    <option value="Billing & Payments">Billing & Payments</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Account Issues">Account Issues</option>
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Sales Question">Sales Question</option>
                    <option value="Emergency/Critical Issue">Emergency/Critical Issue</option>
                  </select>
                  {formErrors.category && (
                    <p id="category-error" className="mt-1 text-xs text-red-600" style={{ fontFamily: 'Poppins' }}>
                      {formErrors.category}
                    </p>
                  )}
                </div>

                {/* Priority Level - Progressive Disclosure */}
                {shouldShowPriority(formData.category) && (
                  <div className="animate-slideDown">
                    <label htmlFor="priority" className="block mb-1.5 text-sm font-medium" style={{ color: '#1F2937', fontFamily: 'Poppins' }}>
                      Priority Level
                    </label>
                    <select
                      id="priority"
                      value={formData.priority}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFieldChange('priority', e.target.value as PriorityLevel)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 appearance-none"
                      style={{
                        fontFamily: 'Poppins',
                        '--tw-ring-color': '#549F74',
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em',
                        paddingRight: '2.5rem'
                      } as React.CSSProperties}
                    >
                      <option value="Low">Low (General question, non-urgent)</option>
                      <option value="Normal">Normal (Standard request)</option>
                      <option value="High">High (Affecting functionality)</option>
                      <option value="Critical">Critical (System down, security issue)</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500" style={{ fontFamily: 'Poppins' }}>
                      Select the urgency level that best matches your issue.
                    </p>
                  </div>
                )}

                {/* Product/Service - Progressive Disclosure */}
                {shouldShowProductService(formData.category) && (
                  <div className="animate-slideDown">
                    <label htmlFor="productService" className="block mb-1.5 text-sm font-medium" style={{ color: '#1F2937', fontFamily: 'Poppins' }}>
                      Related Product/Service
                    </label>
                    <input
                      id="productService"
                      type="text"
                      value={formData.productService}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('productService', e.target.value)}
                      placeholder="e.g., Booking System, Payment Portal, Mobile App"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300"
                      style={{
                        fontFamily: 'Poppins',
                        '--tw-ring-color': '#549F74',
                      } as React.CSSProperties}
                    />
                  </div>
                )}

                {/* Order/Account Number - Progressive Disclosure */}
                {shouldShowOrderAccount(formData.category) && (
                  <div className="animate-slideDown">
                    <label htmlFor="orderAccountNumber" className="block mb-1.5 text-sm font-medium" style={{ color: '#1F2937', fontFamily: 'Poppins' }}>
                      Order/Account Number
                    </label>
                    <input
                      id="orderAccountNumber"
                      type="text"
                      value={formData.orderAccountNumber}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('orderAccountNumber', e.target.value)}
                      placeholder="e.g., ORD-12345 or ACC-67890"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300"
                      style={{
                        fontFamily: 'Poppins',
                        '--tw-ring-color': '#549F74',
                      } as React.CSSProperties}
                    />
                  </div>
                )}

                {/* Detailed Description */}
                <div>
                  <label htmlFor="description" className="block mb-1.5 text-sm font-medium" style={{ color: '#1F2937', fontFamily: 'Poppins' }}>
                    Detailed Description <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      ({formData.description.length}/{MAX_DESCRIPTION_LENGTH} characters)
                    </span>
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                      const value = e.target.value.slice(0, MAX_DESCRIPTION_LENGTH);
                      handleFieldChange('description', value);
                    }}
                    placeholder="Please provide as much detail as possible:
• What were you trying to accomplish?
• Exact steps to reproduce the issue
• What actually happened vs. what you expected
• Error messages received (if any)
• When did the problem start?
• Environment details (browser, OS, device)"
                    required
                    rows={8}
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 resize-y ${
                      formErrors.description ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    style={{
                      fontFamily: 'Poppins',
                      '--tw-ring-color': formErrors.description ? '#ef4444' : '#549F74',
                    } as React.CSSProperties}
                    aria-invalid={!!formErrors.description}
                    aria-describedby={formErrors.description ? 'description-error' : undefined}
                  />
                  {formErrors.description && (
                    <p id="description-error" className="mt-1 text-xs text-red-600" style={{ fontFamily: 'Poppins' }}>
                      {formErrors.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500" style={{ fontFamily: 'Poppins' }}>
                    Minimum 20 characters. Include steps to reproduce, error messages, and environment details for faster resolution.
                  </p>
                </div>

                {/* File Attachments */}
                <div>
                  <label className="block mb-1.5 text-sm font-medium" style={{ color: '#1F2937', fontFamily: 'Poppins' }}>
                    Attachments
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      (Optional, up to {MAX_ATTACHMENTS} files, 10MB each)
                    </span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 transition-colors hover:border-gray-400">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      accept="image/*,.pdf,.txt,.doc,.docx"
                      className="hidden"
                      id="file-upload"
                      disabled={formData.attachments.length >= MAX_ATTACHMENTS}
                    />
                    <label
                      htmlFor="file-upload"
                      className={`flex flex-col items-center justify-center cursor-pointer ${
                        formData.attachments.length >= MAX_ATTACHMENTS ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-sm text-gray-600 text-center" style={{ fontFamily: 'Poppins' }}>
                        Click to upload or drag and drop
                      </span>
                      <span className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Poppins' }}>
                        Images (JPEG, PNG, GIF, WebP), PDF, or Documents (TXT, DOC, DOCX)
                      </span>
                    </label>
                  </div>

                  {/* Attached Files List */}
                  {formData.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {formData.attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg animate-slideDown"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-xs text-gray-700 truncate flex-1" style={{ fontFamily: 'Poppins' }}>
                              {file.name}
                            </span>
                            <span className="text-xs text-gray-500 flex-shrink-0" style={{ fontFamily: 'Poppins' }}>
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(index)}
                            className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            aria-label={`Remove ${file.name}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-2.5 sm:py-3 rounded-lg text-sm sm:text-base text-white font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                    isSubmitting ? 'opacity-75 cursor-not-allowed' : 'hover:opacity-90'
                  }`}
                  style={{ 
                    backgroundColor: '#0B5858',
                    fontFamily: 'Poppins' 
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Submit Ticket'
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center" style={{ fontFamily: 'Poppins' }}>
                  By submitting this form, you agree to our terms of service. We typically respond within 24 hours.
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HelpAndSupport;

