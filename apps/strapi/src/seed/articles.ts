/**
 * Seed data for Article content type.
 * Uses Strapi Blocks JSON format for the body field.
 */

function textBlock(text: string) {
  return [
    {
      type: 'paragraph',
      children: [{ type: 'text', text }],
    },
  ];
}

export const articleSeedData = [
  {
    title: '10 Tips for a Healthier Heart',
    slug: '10-tips-for-a-healthier-heart',
    excerpt:
      'Learn simple lifestyle changes that can significantly improve your cardiovascular health and reduce the risk of heart disease.',
    body: textBlock(
      'Maintaining a healthy heart is one of the most important things you can do for your overall well-being. Regular exercise, a balanced diet rich in fruits and vegetables, adequate sleep, and stress management are all critical factors. Aim for at least 150 minutes of moderate aerobic activity per week, limit sodium intake, and schedule regular check-ups with your doctor to monitor blood pressure and cholesterol levels.',
    ),
    category: 'health-tips',
    reading_time: 5,
    featured: true,
  },
  {
    title: 'Understanding Telemedicine: What to Expect',
    slug: 'understanding-telemedicine-what-to-expect',
    excerpt:
      'A comprehensive guide to preparing for your first virtual doctor visit, from technology requirements to what to have ready.',
    body: textBlock(
      "Telemedicine has transformed how patients access healthcare. Before your appointment, ensure you have a stable internet connection, a device with a camera and microphone, and a quiet private space. Have your insurance card, medication list, and any relevant symptoms documented. During the call, speak clearly and don't hesitate to ask questions. Most follow-up prescriptions and referrals can be handled digitally.",
    ),
    category: 'general',
    reading_time: 4,
    featured: true,
  },
  {
    title: 'Nutrition Basics: Building a Balanced Plate',
    slug: 'nutrition-basics-building-a-balanced-plate',
    excerpt:
      'Discover how to create meals that provide all the essential nutrients your body needs for optimal health.',
    body: textBlock(
      'A balanced plate should consist of approximately half fruits and vegetables, a quarter lean proteins, and a quarter whole grains. Include healthy fats from sources like olive oil, nuts, and avocados. Stay hydrated with water as your primary beverage. Limit processed foods, added sugars, and excessive sodium. Consider consulting a registered dietitian for personalized nutrition advice.',
    ),
    category: 'nutrition',
    reading_time: 6,
    featured: false,
  },
];
