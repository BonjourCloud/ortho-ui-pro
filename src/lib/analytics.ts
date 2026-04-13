// Google Analytics helper functions

declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, any>
    ) => void;
  }
}

/**
 * Track a page view in Google Analytics
 */
export const trackPageView = (url: string) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('config', 'G-XM4W5D4RRL', {
      page_path: url,
    });
  }
};

/**
 * Track a custom event in Google Analytics
 */
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', eventName, eventParams);
  }
};

/**
 * Track appointment booking
 */
export const trackAppointmentBooking = (appointmentType: string) => {
  trackEvent('appointment_booking', {
    event_category: 'engagement',
    event_label: appointmentType,
    value: 1,
  });
};

/**
 * Track contact form submission
 */
export const trackContactFormSubmission = () => {
  trackEvent('contact_form_submit', {
    event_category: 'engagement',
    event_label: 'contact_form',
    value: 1,
  });
};

/**
 * Track phone call click
 */
export const trackPhoneClick = () => {
  trackEvent('phone_click', {
    event_category: 'engagement',
    event_label: 'phone_call',
  });
};

/**
 * Track WhatsApp click
 */
export const trackWhatsAppClick = () => {
  trackEvent('whatsapp_click', {
    event_category: 'engagement',
    event_label: 'whatsapp_chat',
  });
};

/**
 * Track service page view
 */
export const trackServiceView = (serviceName: string) => {
  trackEvent('service_view', {
    event_category: 'content',
    event_label: serviceName,
  });
};
