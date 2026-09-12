export const SCORE_WEIGHTS = Object.freeze({
  process: 0.2,
  midterm: 0.3,
  final: 0.5,
})

const GRADE_RANGES = [
  { minimum: 8.5, letter: 'A', point: 4.0 },
  { minimum: 8.0, letter: 'B+', point: 3.5 },
  { minimum: 7.0, letter: 'B', point: 3.0 },
  { minimum: 6.5, letter: 'C+', point: 2.5 },
  { minimum: 5.5, letter: 'C', point: 2.0 },
  { minimum: 5.0, letter: 'D', point: 1.0 },
  { minimum: 0, letter: 'F', point: 0.0 },
]

export function calculateGrade(processScore, midtermScore, finalScore) {
  const totalScore = Number((
    processScore * SCORE_WEIGHTS.process
    + midtermScore * SCORE_WEIGHTS.midterm
    + finalScore * SCORE_WEIGHTS.final
  ).toFixed(2))

  const grade = GRADE_RANGES.find((range) => totalScore >= range.minimum)

  return {
    totalScore,
    letterGrade: grade.letter,
    gradePoint: grade.point,
    status: totalScore >= 5 ? 'completed' : 'failed',
  }
}
