export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  questionnaireComplete: boolean;
}

export interface Doctor {
  placeId: string;
  name: string;
  rating: number;
  address: string;
  phone?: string;
  openNow?: boolean;
}

export interface ProgressLog {
  id: string;
  date: string;
  notes: string;
  rating: number;
  photoUrl?: string;
}

export interface Recommendation {
  homeRemedies: string[];
  routineChanges: { morning: string[]; night: string[] };
  habitSuggestions: string[];
  products: { name: string; category: string; reason: string }[];
  exercises: string[];
}
