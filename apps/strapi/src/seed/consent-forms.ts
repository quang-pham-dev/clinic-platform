/**
 * Seed data for ConsentForm content type.
 * Uses Strapi Blocks JSON format for the content field.
 */

function textBlock(text: string) {
  return [
    {
      type: 'paragraph',
      children: [{ type: 'text', text }],
    },
  ];
}

export const consentFormSeedData = [
  {
    title: 'Telemedicine Consent Form',
    version: '1.0',
    form_type: 'telemedicine',
    content: textBlock(
      'By signing this consent form, I acknowledge and agree to the following terms for telemedicine consultations:\n\n' +
        '1. I understand that telemedicine involves the use of electronic communications to provide clinical services at a distance.\n' +
        '2. I understand that the information transmitted during a telemedicine consultation may include medical history, examination findings, test results, and treatment plans.\n' +
        '3. I understand that the laws that protect the confidentiality of medical information also apply to telemedicine.\n' +
        '4. I understand that I have the right to withhold or withdraw consent at any time without affecting my right to future care.\n' +
        '5. I understand that technical difficulties may interrupt or terminate the telemedicine session, in which case alternative arrangements will be made.\n' +
        '6. I agree to provide accurate health information during the consultation.',
    ),
    effective_date: '2026-01-01',
    is_current: true,
    change_summary: 'Initial version of the telemedicine consent form.',
  },
  {
    title: 'General Treatment Consent Form',
    version: '1.0',
    form_type: 'general',
    content: textBlock(
      'By signing this consent form, I authorize the healthcare providers at this clinic to provide medical treatment as deemed necessary. I understand that:\n\n' +
        '1. The nature and purpose of the proposed treatment has been explained to me.\n' +
        '2. The potential risks and benefits have been discussed.\n' +
        '3. I have the right to ask questions and receive satisfactory answers.\n' +
        '4. I may revoke this consent at any time.\n' +
        '5. My medical records will be maintained in accordance with applicable privacy laws.',
    ),
    effective_date: '2026-01-01',
    is_current: true,
    change_summary: 'Initial version of the general treatment consent form.',
  },
];
