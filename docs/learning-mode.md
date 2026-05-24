# Learning Mode Map

Status: Draft v0.3  
Area: Learning Mode  
Last updated: 2026-05-24

## Purpose

This file is only the material map.

It should answer:

- What paths exist in Learning Mode?
- What modules exist inside each path?
- What sublessons exist inside each module?
- Where does each sublesson file live?

Do not put full lesson copy, exercise specs, answer keys, or long implementation notes here. Each sublesson has its own file.

## Documentation Layout

```txt
docs/
├─ learning-mode.md
│  └─ top-level map only
│
└─ learning-mode/
   ├─ foundations/
   │  ├─ 0-hi-machine-learning/
   │  │  ├─ 0-1-what-is-machine-learning.md
   │  │  └─ ...
   │  └─ 1-machine-learning-workflow/
   │     ├─ 1-1-ml-tools-and-libraries.md
   │     └─ ...
   │
   ├─ regression/
   │  └─ future detailed regression sublessons
   │
   ├─ clustering/
   │  └─ future detailed clustering sublessons
   │
   └─ classification/
      └─ future detailed classification sublessons
```

## Top-Level Learn Paths

```txt
Learning Mode
├─ 0. Machine Learning Foundations
├─ 1. Regression
├─ 2. Clustering
└─ 3. Classification
```

Machine Learning Foundations is only an introduction path. It gives learners the map and vocabulary.

Deep, specific practice belongs in the specialized paths:

- Regression: numeric prediction.
- Clustering: grouping without labels.
- Classification: category prediction.

## Depth Rule

| Path | Depth |
|---|---|
| Machine Learning Foundations | What it is, why it matters, and where it appears in the workflow. |
| Regression | How the idea works for numeric targets. |
| Clustering | How the idea works when there is no label/target. |
| Classification | How the idea works for class labels. |

If a topic appears in Foundations and a specialized path, Foundations must stay shallow.

## 0. Machine Learning Foundations

```txt
0. Machine Learning Foundations
├─ 0. Hi, Machine Learning!
├─ 1. Machine Learning Workflow
├─ 2. Learning Types
├─ 3. Features and Representation
├─ 4. Generalization
├─ 5. Model Tuning
└─ 6. Closing
```

### 0. Hi, Machine Learning!

| Sublesson | Title | File |
|---|---|---|
| 0.1 | Apa Itu Machine Learning | `docs/learning-mode/foundations/0-hi-machine-learning/0-1-what-is-machine-learning.md` |
| 0.2 | Posisi Machine Learning dalam AI | `docs/learning-mode/foundations/0-hi-machine-learning/0-2-machine-learning-in-ai.md` |
| 0.3 | Komponen Utama dalam Machine Learning | `docs/learning-mode/foundations/0-hi-machine-learning/0-3-core-components.md` |
| 0.4 | Jenis-Jenis Machine Learning | `docs/learning-mode/foundations/0-hi-machine-learning/0-4-learning-types.md` |
| 0.5 | Machine Learning Use Cases | `docs/learning-mode/foundations/0-hi-machine-learning/0-5-machine-learning-use-cases.md` |
| 0.6 | Merumuskan Masalah dalam Machine Learning | `docs/learning-mode/foundations/0-hi-machine-learning/0-6-formulating-machine-learning-problems.md` |

### 1. Machine Learning Workflow

| Sublesson | Title | File |
|---|---|---|
| 1.1 | ML Tools and Libraries | `docs/learning-mode/foundations/1-machine-learning-workflow/1-1-ml-tools-and-libraries.md` |
| 1.2 | Data Collecting | `docs/learning-mode/foundations/1-machine-learning-workflow/1-2-data-collecting.md` |
| 1.3 | Data Loading | `docs/learning-mode/foundations/1-machine-learning-workflow/1-3-data-loading.md` |
| 1.4 | Data Cleaning and Transformation | `docs/learning-mode/foundations/1-machine-learning-workflow/1-4-data-cleaning-and-transformation.md` |
| 1.5 | Exploratory and Explanatory Data Analysis | `docs/learning-mode/foundations/1-machine-learning-workflow/1-5-exploratory-and-explanatory-data-analysis.md` |
| 1.6 | Data Splitting | `docs/learning-mode/foundations/1-machine-learning-workflow/1-6-data-splitting.md` |
| 1.7 | Modeling | `docs/learning-mode/foundations/1-machine-learning-workflow/1-7-modeling.md` |

### 2. Learning Types

| Sublesson | Title | File |
|---|---|---|
| 2.1 | Supervised Learning | `docs/learning-mode/foundations/2-learning-types/2-1-supervised-learning.md` |
| 2.2 | Unsupervised Learning | `docs/learning-mode/foundations/2-learning-types/2-2-unsupervised-learning.md` |
| 2.3 | Regression, Clustering, and Classification Map | `docs/learning-mode/foundations/2-learning-types/2-3-regression-clustering-classification-map.md` |

### 3. Features and Representation

| Sublesson | Title | File |
|---|---|---|
| 3.1 | Useful Features | `docs/learning-mode/foundations/3-features-and-representation/3-1-useful-features.md` |
| 3.2 | Feature Engineering Preview | `docs/learning-mode/foundations/3-features-and-representation/3-2-feature-engineering-preview.md` |
| 3.3 | Data Leakage Preview | `docs/learning-mode/foundations/3-features-and-representation/3-3-data-leakage-preview.md` |

### 4. Generalization

| Sublesson | Title | File |
|---|---|---|
| 4.1 | Train vs Test Intuition | `docs/learning-mode/foundations/4-generalization/4-1-train-vs-test-intuition.md` |
| 4.2 | Baseline Model | `docs/learning-mode/foundations/4-generalization/4-2-baseline-model.md` |
| 4.3 | Overfitting | `docs/learning-mode/foundations/4-generalization/4-3-overfitting.md` |
| 4.4 | Underfitting | `docs/learning-mode/foundations/4-generalization/4-4-underfitting.md` |

### 5. Model Tuning

| Sublesson | Title | File |
|---|---|---|
| 5.1 | Parameters vs Hyperparameters | `docs/learning-mode/foundations/5-model-tuning/5-1-parameters-vs-hyperparameters.md` |
| 5.2 | Validation | `docs/learning-mode/foundations/5-model-tuning/5-2-validation.md` |
| 5.3 | Tuning Without Cheating | `docs/learning-mode/foundations/5-model-tuning/5-3-tuning-without-cheating.md` |

### 6. Closing

| Sublesson | Title | File |
|---|---|---|
| 6.1 | ML Workflow Recap | `docs/learning-mode/foundations/6-closing/6-1-ml-workflow-recap.md` |
| 6.2 | Choose Next Path | `docs/learning-mode/foundations/6-closing/6-2-choose-next-path.md` |

## 1. Regression

Regression is the path for numeric prediction.

```txt
1. Regression
├─ 0. Regression Problem Setup
├─ 1. Regression Dataset Preparation
├─ 2. EDA for Regression
├─ 3. Train/Test Split and Baseline
├─ 4. Linear Regression
├─ 5. Regression Metrics
├─ 6. Residuals and Error Diagnosis
├─ 7. Feature Engineering for Regression
├─ 8. Regularization and Tuning
└─ 9. Regression Capstone
```

Regression details should not live in Machine Learning Foundations.

### Parked Drafts

| Draft | Purpose | File |
|---|---|---|
| 0.1 | Feature, target, and metadata role assignment moved out of Foundations for later regression problem setup. | `docs/learning-mode/regression/0-regression-problem-setup/0-1-feature-target-and-metadata.md` |

## 2. Clustering

Clustering is the path for grouping examples without labels.

```txt
2. Clustering
├─ 0. Clustering Problem Setup
├─ 1. Clustering Dataset Preparation
├─ 2. Features, Scaling, and Similarity
├─ 3. First Clustering Model
├─ 4. Choosing the Number of Clusters
├─ 5. Cluster Interpretation
├─ 6. Cluster Quality and Limits
└─ 7. Clustering Capstone
```

Clustering details should not live in Machine Learning Foundations.

## 3. Classification

Classification is the path for category prediction.

```txt
3. Classification
├─ 0. Classification Problem Setup
├─ 1. Classification Dataset Preparation
├─ 2. EDA for Classification
├─ 3. Train/Test Split and Baseline
├─ 4. First Classifier
├─ 5. Confusion Matrix
├─ 6. Precision, Recall, F1
├─ 7. Class Imbalance
├─ 8. Threshold Tuning
└─ 9. Classification Capstone
```

Classification details should not live in Machine Learning Foundations.

## Repetition Guardrails

### Data

- Foundations: data as input material, features, labels, metadata.
- Regression: numeric target preparation.
- Clustering: feature-only dataset preparation.
- Classification: label/class preparation.

### Cleaning

- Foundations: what cleaning is and why it matters.
- Regression: cleaning numeric targets and numeric features.
- Clustering: cleaning features that affect similarity.
- Classification: cleaning labels, classes, and class balance.

### EDA

- Foundations: exploration vs explanation.
- Regression: numeric distributions and feature-target relationships.
- Clustering: feature distributions and similarity patterns.
- Classification: class balance and feature-label comparisons.

### Splitting

- Foundations: train/test intuition.
- Regression: numeric target holdout and mean baseline.
- Clustering: validation through stability and interpretation, not labels.
- Classification: stratified splits and majority-class baseline.

### Modeling

- Foundations: modeling as a workflow step.
- Regression: numeric prediction.
- Clustering: grouping similar examples.
- Classification: class prediction.

### Evaluation

- Foundations: evaluation checks whether the model is useful beyond training examples.
- Regression: MAE, RMSE, residuals.
- Clustering: cluster quality, stability, interpretation limits.
- Classification: confusion matrix, precision, recall, F1.

## Sublesson File Template

Each sublesson file should use this structure:

```md
# <Sublesson Number>: <Title>

Status: Draft
Path: <Learning Path>
Module: <Module Number and Title>

## Goal

## Material

## Exercise

## Feedback

## Hints

## Implementation Notes
```
