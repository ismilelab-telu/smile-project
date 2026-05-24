# 0.1: Feature, Target, and Metadata Roles

Status: Parked Draft  
Path: Regression  
Module: 0. Regression Problem Setup

## Source

Moved out of Machine Learning Foundations `0.1` because the exercise is already about supervised prediction setup, not the first introduction to data.

This draft is saved for the Regression path and should be rewritten later around numeric prediction.

## Goal

Prepare learners to assign column roles for a supervised regression problem.

## Material

Data is the basic material of machine learning. Without data, a model has nothing to learn from and nothing meaningful to improve.

A dataset is made of examples and information about those examples. In a table, each row is one example, and each column describes one kind of information.

In supervised learning, some columns can become features and one column can become the label or target. Features are inputs. The label or target is the result we want the model to predict.

For regression, the target is numeric.

Data quality and quantity affect model performance. The data should be clean, relevant, and representative enough for the problem.

## Exercise

Ask the learner to assign column roles in a small cafe shift dataset.

Roles:

- Target.
- Safe feature.
- Metadata.
- Ignore / not used yet.

## Feedback

Explain mistakes based on role confusion:

- No target selected.
- Too many targets selected.
- Metadata selected as target.
- Future or answer information selected as feature.

## Hints

1. The target is the numeric value we want to predict.
2. A safe feature is known before the prediction is made.
3. Metadata helps identify a row but usually does not explain the outcome.

## Implementation Notes

Previous app lesson ID: `lesson-0-1-feature-target`.
