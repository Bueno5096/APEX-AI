// Shared health metric category helpers used by coach.tsx and body-composition.tsx

export const getBFCategory = (bf: number, gender: string): string => {
  if (gender === 'male') {
    if (bf < 6) return 'Essential';
    if (bf < 14) return 'Athletic';
    if (bf < 18) return 'Fitness';
    if (bf < 25) return 'Average';
    return 'Obese';
  }
  if (bf < 14) return 'Essential';
  if (bf < 21) return 'Athletic';
  if (bf < 25) return 'Fitness';
  if (bf < 32) return 'Average';
  return 'Obese';
};

export const getFFMICategory = (ffmi: number): string => {
  if (ffmi < 17) return 'Below Average';
  if (ffmi < 18) return 'Average';
  if (ffmi < 20) return 'Above Average';
  if (ffmi < 22) return 'Excellent';
  if (ffmi < 23) return 'Superior';
  if (ffmi < 26) return 'Suspiciously High';
  return 'Exceeds Natural';
};

export const getBMICategory = (bmi: number): string => {
  if (bmi < 14) return 'Significantly Undermuscled';
  if (bmi < 17) return 'Undermuscled';
  if (bmi < 20) return 'Normal';
  if (bmi < 23) return 'Athletic';
  if (bmi < 26) return 'Very Athletic';
  return 'Elite Athletic';
};

export const getMuscleToFatCategory = (ratio: number): string => {
  if (ratio < 3) return 'Low';
  if (ratio < 5) return 'Average';
  if (ratio < 7) return 'Good';
  if (ratio < 10) return 'Excellent';
  return 'Elite';
};
