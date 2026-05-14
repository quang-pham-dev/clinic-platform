/**
 * Seed data for FAQ content type.
 * Grouped by category with explicit ordering.
 */
export const faqSeedData = [
  // Booking category
  {
    question: 'How do I book an appointment?',
    answer:
      'Navigate to the **Doctors** page, select a doctor, and choose an available time slot. You can book appointments for in-person visits or telemedicine consultations. After confirming, you will receive a confirmation notification.',
    category: 'booking',
    order: 1,
    is_active: true,
  },
  {
    question: 'Can I cancel or reschedule my appointment?',
    answer:
      'Yes, you can cancel or reschedule appointments from your **Appointments** page in the patient portal. Please note that cancellations should be made at least 24 hours in advance. To reschedule, cancel the existing appointment and book a new one.',
    category: 'booking',
    order: 2,
    is_active: true,
  },

  // Video call category
  {
    question: 'What do I need for a video consultation?',
    answer:
      'You need a device with a camera and microphone (laptop, tablet, or smartphone), a stable internet connection, and a private quiet space. The video call runs directly in your browser — no additional software is required.',
    category: 'video-call',
    order: 1,
    is_active: true,
  },
  {
    question: 'What happens if the video call drops?',
    answer:
      'If the connection drops, try refreshing your browser and rejoining the call from your **Appointments** page. The doctor will remain in the waiting room. If the issue persists, contact our support team and we will help you reschedule.',
    category: 'video-call',
    order: 2,
    is_active: true,
  },

  // Medical records category
  {
    question: 'How do I access my medical records?',
    answer:
      'Your medical records are available in the **Records** section of your patient portal. After each completed appointment, your doctor will create a medical record that includes diagnosis, prescription, and notes. Records become visible once the doctor publishes them.',
    category: 'medical-records',
    order: 1,
    is_active: true,
  },

  // Account category
  {
    question: 'How do I update my profile information?',
    answer:
      'Go to **Profile** in your patient portal. You can update your full name, phone number, date of birth, gender, and address. Changes are saved immediately.',
    category: 'account',
    order: 1,
    is_active: true,
  },
  {
    question: 'How do I reset my password?',
    answer:
      'Click the **Forgot password** link on the login page. Enter your registered email address and we will send you a password reset link. The link expires after 1 hour.',
    category: 'account',
    order: 2,
    is_active: true,
  },

  // General category
  {
    question: 'What are the clinic operating hours?',
    answer:
      'Our clinic operates **Monday to Friday, 8:00 AM to 6:00 PM** and **Saturday, 8:00 AM to 12:00 PM**. We are closed on Sundays and public holidays. Telemedicine consultations may be available outside these hours depending on doctor availability.',
    category: 'general',
    order: 1,
    is_active: true,
  },
];
