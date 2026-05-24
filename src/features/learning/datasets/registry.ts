import { smileCafeDemandIntroDataset } from "./smile-cafe-demand-intro";

const datasets = [smileCafeDemandIntroDataset];

export function getDataset(datasetId: string) {
  return datasets.find((dataset) => dataset.id === datasetId);
}

export function getDatasetView(datasetId: string, viewId: string) {
  const dataset = getDataset(datasetId);

  if (!dataset) {
    return undefined;
  }

  const view = dataset.views.find((datasetView) => datasetView.id === viewId);

  if (!view) {
    return undefined;
  }

  return {
    columns: view.columnIds
      .map((columnId) => dataset.columns.find((column) => column.id === columnId))
      .filter((column) => column !== undefined),
    dataset,
    rows: view.rowIds
      .map((rowId) => dataset.rows.find((row) => row.id === rowId))
      .filter((row) => row !== undefined),
    view,
  };
}
