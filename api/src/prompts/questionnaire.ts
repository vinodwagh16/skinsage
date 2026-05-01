export const QUESTIONNAIRE_FIELDS = [
  { key: "skincare_routine", question: "What does your current skincare routine look like? (morning/night products, if any)" },
  { key: "diet_type", question: "How would you describe your diet? (e.g. vegetarian, non-veg, vegan, lots of junk food)" },
  { key: "water_intake", question: "Roughly how much water do you drink per day? (glasses or ml)" },
  { key: "sleep", question: "How many hours of sleep do you typically get, and how would you rate the quality?" },
  { key: "smoking", question: "Do you smoke? If yes, how frequently?" },
  { key: "alcohol", question: "How often do you consume alcohol?" },
  { key: "exercise", question: "How often do you exercise, and what kind?" },
  { key: "stress", question: "How would you rate your stress level lately — low, medium, or high?" },
  { key: "sun_exposure", question: "How much sun exposure do you get daily, and do you use sunscreen?" },
];

export const QUESTIONNAIRE_TRANSITION = `
Now I have a better picture of your concern. To give you truly personalized advice,
I'd like to understand your lifestyle a bit better. I'll ask a few quick questions —
just answer naturally, no need to be precise.
`;
