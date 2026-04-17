export interface DoctorPageSeedDraft {
  fullName: string;
  specialty: string;
  displayName: string;
  specialtyLabel: string;
  shortBio: string;
  longBio: string;
  languages: string[];
}

export const doctorPageSeedDrafts: DoctorPageSeedDraft[] = [
  {
    fullName: 'Dr. Quang Pham',
    specialty: 'General Practice',
    displayName: 'Dr. Quang Pham',
    specialtyLabel: 'Family Medicine',
    shortBio:
      'A trusted family physician focused on preventive care, chronic disease management, and long-term patient relationships.',
    longBio:
      'Dr. Quang Pham brings a calm, practical approach to family medicine with a strong focus on prevention, continuity of care, and clear communication. He works closely with patients to build sustainable treatment plans for everyday health concerns, chronic disease follow-up, and annual wellness care.',
    languages: ['English', 'Vietnamese'],
  },
  {
    fullName: 'Dr. Sarah Brown',
    specialty: 'Cardiology',
    displayName: 'Dr. Sarah Brown',
    specialtyLabel: 'Cardiology and Heart Health',
    shortBio:
      'Cardiologist specializing in early cardiovascular risk detection, preventive heart care, and long-term monitoring.',
    longBio:
      'Dr. Sarah Brown focuses on helping patients understand cardiovascular risk before it becomes urgent. Her practice covers diagnostic review, hypertension and cholesterol management, and long-term care planning for patients who need a structured approach to heart health.',
    languages: ['English'],
  },
  {
    fullName: 'Dr. Michael Chen',
    specialty: 'Dermatology',
    displayName: 'Dr. Michael Chen',
    specialtyLabel: 'Dermatology and Skin Care',
    shortBio:
      'Dermatologist with a patient-friendly approach to chronic skin conditions, flare management, and treatment education.',
    longBio:
      'Dr. Michael Chen treats a wide range of skin, hair, and nail conditions with a focus on clear treatment plans and practical self-care guidance. He works with patients to manage recurring conditions such as acne, eczema, and inflammatory skin issues while keeping care approachable and easy to follow.',
    languages: ['English', 'Mandarin'],
  },
  {
    fullName: 'Dr. Emily Davis',
    specialty: 'Neurology',
    displayName: 'Dr. Emily Davis',
    specialtyLabel: 'Neurology and Headache Care',
    shortBio:
      'Neurologist experienced in migraine care, seizure follow-up, and guiding patients through complex neurological symptoms.',
    longBio:
      'Dr. Emily Davis supports patients dealing with persistent headaches, migraine disorders, seizure care, and other neurological concerns that benefit from structured follow-up. She emphasizes symptom tracking, medication planning, and helping patients understand when urgent escalation is needed.',
    languages: ['English'],
  },
  {
    fullName: 'Dr. Robert Taylor',
    specialty: 'Pediatrics',
    displayName: 'Dr. Robert Taylor',
    specialtyLabel: 'Pediatrics and Child Wellness',
    shortBio:
      'Pediatrician focused on developmental follow-up, preventive visits, and helping families navigate everyday childhood health needs.',
    longBio:
      'Dr. Robert Taylor provides pediatric care for infants, children, and teens with an emphasis on family communication and practical next steps. His work includes growth and development follow-up, common childhood illness assessment, and helping caregivers feel informed and supported at every stage.',
    languages: ['English', 'Spanish'],
  },
];
