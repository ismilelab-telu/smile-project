export type DataPoint = {
  x: number;
  y: number;
};

export type SimpleLinearRegressionModel = {
  slope: number;
  intercept: number;
  predict: (x: number) => number;
};

export const sampleRegressionPoints: DataPoint[] = [
  { x: 1, y: 2 },
  { x: 2, y: 3 },
  { x: 3, y: 5 },
  { x: 4, y: 4 },
  { x: 5, y: 6 },
  { x: 6, y: 7 },
  { x: 7, y: 8 },
  { x: 8, y: 8 },
];

export function fitSimpleLinearRegression(points: DataPoint[]): SimpleLinearRegressionModel {
  if (points.length < 2) {
    throw new Error("At least two points are required to fit a simple linear regression model.");
  }

  const meanX = mean(points.map((point) => point.x));
  const meanY = mean(points.map((point) => point.y));

  const numerator = points.reduce(
    (total, point) => total + (point.x - meanX) * (point.y - meanY),
    0,
  );
  const denominator = points.reduce((total, point) => total + (point.x - meanX) ** 2, 0);

  if (denominator === 0) {
    throw new Error("The x values must not all be identical.");
  }

  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;

  return {
    slope,
    intercept,
    predict: (x: number) => slope * x + intercept,
  };
}

function mean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}
