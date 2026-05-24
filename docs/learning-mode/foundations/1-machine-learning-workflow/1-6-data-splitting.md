# 1.6: Data Splitting

Status: Draft  
Path: Machine Learning Foundations  
Module: 1. Machine Learning Workflow

## Goal

Explain why data is split before evaluation.

## Material

A model can look good on examples it already saw.

Data splitting keeps some examples aside so the model can be checked on data that feels more like future data.

The foundation lesson should explain the intuition only. Detailed splitting rules belong in the specialized paths.

## Exercise

Choose choices that make data splitting useful.

## Feedback

Warn against using test data repeatedly while making decisions.

## Hints

1. Training data is for learning.
2. Test data is for checking.
3. Reusing test data too much can fool evaluation.

## Implementation Notes

Current app lesson ID: `lesson-1-6-data-splitting`.
