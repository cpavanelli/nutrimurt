export interface MealPlanListItem {
  id: number;
  name: string;
  patientId: number;
  patientName: string;
  mealPlanDate: string;
  totalCals: number;
  createdAt: string;
}

export interface MealPlanEntry {
  id: number;
  mealType: number;
  food: string;
  amount: string;
  substitution: boolean;
}

export interface MealPlan {
  id: number;
  patientId: number;
  patientName: string;
  patientWeight: number;
  name: string;
  totalCals: number;
  mealPlanDate: string;
  createdAt: string;
  entries: MealPlanEntry[];
}

export interface MealPlanInput {
  id?: number;
  patientId: number;
  name: string;
  totalCals: number;
  mealPlanDate: string;
  entries: Array<Omit<MealPlanEntry, 'id'>>;
}
