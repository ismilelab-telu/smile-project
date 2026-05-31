import type { Locale } from "@/features/localization/localization";

type ExerciseHintCopy = Partial<Record<Locale, string[]>> & { id: string[] };

export const learningHintGlossaryByExerciseId = {
  "exercise-0-1-what-is-machine-learning": {
    id: ["Cari pernyataan yang menyebut sistem belajar pola dari data untuk contoh baru."],
    en: ["Look for the statement where a system learns patterns from data for new examples."],
  },
  "exercise-0-2-machine-learning-in-ai": {
    id: [
      "Cari relasi payung: machine learning berada di dalam AI dan cara kerjanya belajar dari data.",
    ],
    en: [
      "Look for the umbrella relationship: machine learning sits inside AI and learns from data.",
    ],
  },
  "exercise-0-3-core-components": {
    id: [
      "Mulai dari kebutuhan atau tugas yang ingin diselesaikan; tanpa ini model tidak punya arah.",
      "Contoh historis menjadi bahan belajar, bukan sekadar pelengkap laporan.",
      "Bagian yang menyimpan pola hasil belajar adalah model.",
      "Proses belajar terjadi saat model disesuaikan dari contoh.",
      "Komponen akhir memeriksa apakah hasil model benar-benar berguna.",
    ],
    en: [
      "Start from the need or task to solve; without it, the model has no direction.",
      "Historical examples are the learning material, not just report decoration.",
      "The part that stores learned patterns is the model.",
      "Learning happens when the model is adjusted from examples.",
      "The final component checks whether the model result is actually useful.",
    ],
  },
  "exercise-0-4-learning-types": {
    id: [
      "Output berupa angka mengarah ke regresi.",
      "Output berupa kategori mengarah ke klasifikasi.",
      "Mencari kelompok tanpa label jawaban mengarah ke clustering.",
      "Belajar memilih tindakan dari reward mengarah ke reinforcement learning.",
    ],
    en: [
      "Numeric output points to regression.",
      "Category output points to classification.",
      "Finding groups without answer labels points to clustering.",
      "Learning actions from rewards points to reinforcement learning.",
    ],
  },
  "exercise-0-5-machine-learning-use-cases": {
    id: [
      "Masalah estimasi durasi dari jarak, cuaca, trafik, dan kendaraan cocok untuk prediksi berbasis pola.",
      "Kelompok pelanggan dari riwayat perilaku adalah tugas mencari segmen.",
      "Risiko transaksi bisa dipelajari dari pola kasus sebelumnya jika data tersedia.",
    ],
    en: [
      "Estimating duration from distance, weather, traffic, and vehicle type fits pattern-based prediction.",
      "Customer groups from behavior history are a segmentation task.",
      "Transaction risk can be learned from patterns in previous cases when data is available.",
    ],
  },
  "exercise-0-6-formulate-problem": {
    id: [
      "Jawaban yang ingin keluar dari model adalah durasi pengiriman.",
      "Karena outputnya angka, jenis tugasnya regresi.",
      "Input yang aman adalah konteks order yang sudah diketahui sebelum pengiriman selesai.",
      "Rumusan masalah harus menyebut output dan konteks inputnya dalam satu kalimat.",
    ],
    en: [
      "The answer the model should produce is delivery duration.",
      "Because the output is numeric, the task type is regression.",
      "Safe inputs are order context known before the delivery finishes.",
      "The problem statement should mention the output and input context in one sentence.",
    ],
  },
  "exercise-0-6-select-feature-target": {
    id: [
      "Target adalah output yang ingin diprediksi.",
      "Fitur harus tersedia sebelum waktu prediksi.",
      "ID biasanya metadata.",
      "Informasi yang baru diketahui setelah kejadian selesai tidak aman dipakai sebagai fitur.",
    ],
    en: [
      "The target is the output you want to predict.",
      "Features must be available before prediction time.",
      "An ID is usually metadata.",
      "Information only known after the event is not safe to use as a feature.",
    ],
  },
  "exercise-1-1-classify-column-types": {
    id: [
      "An identifier can be stored as text because arithmetic on it has no meaning.",
      "A traffic level names a group or category.",
      "Distance supports numeric arithmetic such as averages and differences.",
      "A delivery-time target is still numeric because its values are measured in minutes.",
    ],
  },
  "exercise-1-1-ml-tools-libraries": {
    id: [
      "Notebook membantu jejak eksperimen tetap bisa diaudit.",
      "Pandas cocok untuk membaca sampel, tipe kolom, dan nilai kosong.",
      "Grafik ringkas membantu melihat pola target sebelum model dilatih.",
      "Scikit-learn cocok untuk baseline sederhana yang jadi pembanding awal.",
    ],
    en: [
      "A notebook keeps the experiment trail auditable.",
      "Pandas fits sample, column-type, and blank-value checks.",
      "Quick charts help reveal the target pattern before training.",
      "Scikit-learn fits a simple baseline for the first benchmark.",
    ],
  },
  "exercise-1-2-data-collecting": {
    id: [
      "Mulai dari output prediksi, unit baris, dan batas data yang dibutuhkan model.",
      "Asal sumber, periode, dan cara data diambil harus bisa dilacak.",
      "Izin, privasi, dan batas pakai field perlu dicek sebelum data dipakai.",
      "Data harus mencakup variasi kondisi yang akan dihadapi model.",
    ],
    en: [
      "Start from the prediction output, row unit, and data coverage the model needs.",
      "Source origin, period, and collection method must be traceable.",
      "Permission, privacy, and field-use limits need checking before the data is used.",
      "The data should cover the condition variety the model will face.",
    ],
  },
  "exercise-1-2-open-source-data-search": {
    id: [
      "Di Kaggle, buka Data Hub > Datasets, lalu gunakan Filters untuk mencari linear regression.",
      "Setelah filter diterapkan, cari food deliv dan pilih hasil teratas yang relevan.",
      "Bagian Tentang dataset bisa terisi otomatis dari halaman sumber; jika tidak, isi manual dari deskripsi dataset.",
    ],
    en: [
      "On Kaggle, open Data Hub > Datasets, then use Filters to search for linear regression.",
      "After applying the filter, search for food deliv and choose the most relevant top result.",
      "The About dataset field can be filled automatically from the source page; if it is not, fill it manually from the dataset description.",
    ],
  },
  "exercise-1-2-prediction-time-availability": {
    id: [
      "Distance is known before the delivery finishes.",
      "Traffic level is context available at prediction time.",
      "Weather can be used when it is known before the estimate is made.",
      "Vehicle type is chosen before delivery and can help estimate duration.",
    ],
  },
  "exercise-1-3-data-loading": {
    id: [
      "Tahap awal memindahkan sumber mentah ke tabel atau dataframe yang bisa diperiksa.",
      "Nama kolom, tipe data, dan field wajib perlu divalidasi setelah data masuk.",
      "Melihat beberapa baris membantu menangkap masalah loading yang kasar.",
    ],
    en: [
      "The first loading step moves raw sources into an inspectable table or dataframe.",
      "Column names, data types, and required fields need validation after data loads.",
      "Previewing a few rows helps catch rough loading issues.",
    ],
  },
  "exercise-1-3-kaggle-zip-loading": {
    id: [
      "Mulai dari link dataset Kaggle yang sudah kamu submit sebelumnya.",
      "Download ZIP dilakukan manual dari halaman Kaggle, bukan lewat command terminal.",
      "Setelah ZIP diupload, gunakan path CSV yang muncul untuk menulis `pd.read_csv`.",
    ],
    en: [
      "Start from the Kaggle dataset link you submitted earlier.",
      "Download the ZIP manually from the Kaggle page, not through a terminal command.",
      "After uploading the ZIP, use the displayed CSV path to write `pd.read_csv`.",
    ],
  },
  "exercise-1-3-mark-first-look-issues": {
    id: [
      "A blank feature value is a missing-value issue.",
      "Negative delivery time violates the meaning of the field.",
      "Inconsistent category spelling should be flagged.",
      "A blank target is a high-priority issue for supervised learning.",
    ],
  },
  "exercise-1-4-cleaning-transformation": {
    id: [
      "Nilai kosong atau mustahil perlu ditangani dengan alasan yang jelas.",
      "Kategori atau format yang tidak konsisten perlu diseragamkan.",
      "Field baru hanya aman jika tidak memakai jawaban target atau informasi masa depan.",
    ],
    en: [
      "Missing or impossible values need handling with a clear reason.",
      "Inconsistent categories or formats need standardization.",
      "A new field is safe only when it avoids target answers or future information.",
    ],
  },
  "exercise-1-5-exploratory-explanatory-analysis": {
    id: [
      "Eksplorasi mencari pola, gap, dan pertanyaan lanjutan dari data.",
      "Eksplanasi menyajikan temuan terpilih agar orang lain memahami klaimnya.",
      "Klaim analisis harus berhenti di bukti yang tersedia.",
    ],
    en: [
      "Exploration looks for patterns, gaps, and follow-up questions in the data.",
      "Explanation presents selected findings so others can understand the claim.",
      "Analysis claims should stop at the available evidence.",
    ],
  },
  "exercise-1-6-data-splitting": {
    id: [
      "Data uji perlu ditahan sebagai perkiraan data baru yang belum dilihat.",
      "Split dilakukan sebelum transformasi atau model belajar dari data.",
      "Train dan test tetap perlu mewakili kondisi masalah nyata.",
    ],
    en: [
      "Test data should be held out as an estimate of new unseen data.",
      "Split before transformations or models learn from the data.",
      "Train and test still need to represent the real problem conditions.",
    ],
  },
  "exercise-1-7-modeling": {
    id: [
      "Baseline memberi pembanding sederhana untuk menilai model.",
      "Model belajar saat dilatih memakai data latih.",
      "Evaluasi melihat error dan batasan, bukan sekadar satu skor.",
    ],
    en: [
      "A baseline gives a simple comparison point for judging the model.",
      "The model learns when it is trained on training data.",
      "Evaluation looks at errors and limitations, not just one score.",
    ],
  },
  "exercise-2-1-choose-chart-by-question": {
    id: [
      "A single numeric target distribution is read well with a histogram.",
      "Two numeric variables fit a scatter plot.",
      "Counts across traffic categories fit a bar chart.",
      "Comparing delivery-time summaries by vehicle type fits grouped summaries.",
    ],
  },
  "exercise-2-2-select-histogram-conclusion": {
    id: [
      "A longer right tail means a few deliveries take much longer than most.",
      "A broad range means model error should be interpreted in real units.",
    ],
  },
  "exercise-2-3-select-promising-feature": {
    id: [
      "Choose the feature whose scatter plot rises with delivery time and has real route meaning.",
    ],
  },
  "exercise-2-4-mark-outlier-candidate": {
    id: [
      "Unusual distance-time combinations should be marked for investigation.",
      "Keep context before removing a point; unusual does not automatically mean invalid.",
    ],
  },
  "exercise-2-5-eda-conclusion": {
    id: [
      "EDA conclusions should cite visible evidence.",
      "Avoid claims that the chart cannot support.",
      "A useful conclusion points to a next decision.",
    ],
  },
  "exercise-2-classification-evaluation": {
    id: [
      "A predicted-versus-actual label table reveals which classes are confused.",
      "Precision and recall focus on different error costs.",
      "Class balance must be checked before trusting accuracy alone.",
    ],
  },
  "exercise-2-classification-labels": {
    id: [
      "Look for a target that comes from a limited list of allowed labels.",
      "The output is a category decision, not a numeric quantity.",
      "Training rows already include the correct label.",
    ],
  },
  "exercise-2-classification-probability": {
    id: [
      "Some classifiers output a score per class before the final decision.",
      "A cutoff converts the score into a chosen label.",
      "A high score is evidence, but it is not a guarantee.",
    ],
  },
  "exercise-3-1-missing-values": {
    id: [
      "The right action depends on how much is missing and where.",
      "Missingness can have a pattern.",
      "Dropping rows is not always the safest first move.",
    ],
  },
  "exercise-3-2-duplicate-rows": {
    id: [
      "A true duplicate repeats the same order record, not just one shared field.",
      "Repeated records can overweight examples in summaries and model training.",
    ],
  },
  "exercise-3-3-invalid-values": {
    id: [
      "Negative delivery time is impossible for the field.",
      "Negative courier experience is another impossible physical value.",
      "A very long delivery can be valid when route context supports it.",
    ],
  },
  "exercise-3-4-outlier-valid-or-error": {
    id: [
      "Use other fields and domain context before judging an outlier.",
      "Confirmed data errors should be corrected or removed.",
      "Rare but valid cases should stay in the dataset.",
    ],
  },
  "exercise-3-5-cleaning-summary": {
    id: [
      "Record the exact cleaning action.",
      "Record why that action was chosen.",
      "Handle missing target values carefully instead of hiding them with arbitrary fills.",
    ],
  },
  "exercise-4-1-safe-features": {
    id: [
      "A safe feature is available before prediction.",
      "The target must not be used as input.",
      "Identifiers rarely explain the outcome by themselves.",
    ],
  },
  "exercise-4-2-data-leakage": {
    id: [
      "Fields known only after the prediction point can leak the future.",
      "Values computed from the target reveal the answer indirectly.",
      "Using final delivery time to predict final delivery time is direct leakage.",
    ],
  },
  "exercise-4-3-weak-feature-representation": {
    id: [
      "A feature can be available but poorly represented.",
      "Linear models need useful numeric representations.",
      "A weak representation can hide a real pattern.",
    ],
  },
  "exercise-4-4-safe-feature-engineering": {
    id: [
      "Derived route or traffic flags can be safe when built from existing input fields.",
      "Traffic-level indicators are safe if traffic is known before prediction.",
      "Row-wise transformations avoid using other rows or the target.",
    ],
  },
  "exercise-4-5-avoid-irrelevant-features": {
    id: [
      "A new feature should come from a plausible model hypothesis.",
      "Random IDs should not be treated as predictive meaning.",
      "A feature earns its place by improving held-out evaluation.",
    ],
  },
  "exercise-5-1-why-train-test-split": {
    id: [
      "The goal is estimating behavior on data the model has not seen.",
      "A holdout set is reserved for evaluation.",
      "Training-only scores are too easy to overtrust.",
    ],
  },
  "exercise-5-2-split-before-distribution-transform": {
    id: [
      "Split before fitting any transformation that learns dataset statistics.",
      "Learn preprocessing settings from training data only.",
      "Apply learned settings to test data without refitting.",
    ],
  },
  "exercise-5-3-mean-baseline": {
    id: [
      "For regression, predicting the training target mean is a common baseline.",
      "A model needs to be compared against that simple reference.",
      "The baseline is a benchmark, not the final modeling goal.",
    ],
  },
  "exercise-5-4-representative-split": {
    id: [
      "Train and test should cover broadly similar target behavior.",
      "Sorting by target before splitting can create biased sets.",
      "Check that both sets include realistic delivery-time ranges.",
    ],
  },
  "exercise-6-1-fit-a-line": {
    id: [
      "Linear Regression fits a straight-line relationship.",
      "The fitted line is chosen to reduce prediction errors.",
      "It is a useful first model when the visual pattern is roughly linear.",
    ],
  },
  "exercise-6-2-linear-prediction": {
    id: [
      "Use feature values as inputs for the model.",
      "The output is the predicted target value.",
      "Read regression output in the target unit.",
    ],
  },
  "exercise-6-3-residual": {
    id: [
      "Residual is computed by comparing actual and predicted values.",
      "The sign tells whether the model overpredicts or underpredicts.",
      "Large magnitudes identify examples where the model misses badly.",
    ],
  },
  "exercise-6-4-error-metrics": {
    id: [
      "MAE is easy to read in target units.",
      "RMSE penalizes larger errors more strongly.",
      "Metrics need comparison context.",
    ],
  },
  "exercise-6-5-diagnose-underfitting": {
    id: [
      "Patterned residuals suggest structure is still missed.",
      "Weak feature representation can limit the model.",
      "A too-simple model may miss the real relationship.",
    ],
  },
  "exercise-6-6-retrain-with-feature-engineering": {
    id: [
      "Add only safe engineered features supported by evidence.",
      "Changing inputs requires training a new model.",
      "The changed model must be checked again on held-out data.",
    ],
  },
  "exercise-6-7-model-conclusion": {
    id: [
      "Compare baseline, first model, and improved model rather than one number alone.",
      "Use metric and residual evidence in the conclusion.",
      "State limitations so the result is not oversold.",
    ],
  },
  "exercise-clustering-1-groups": {
    id: [
      "Clustering does not start with a target column.",
      "The goal is to find groups of similar examples.",
      "Clusters are a way to explore structure, not final truth by default.",
    ],
  },
  "exercise-clustering-2-features": {
    id: [
      "Clustering depends heavily on the features used to measure similarity.",
      "Large-scale numeric columns can dominate distance-based methods.",
      "IDs usually create fake uniqueness instead of useful similarity.",
    ],
  },
  "exercise-clustering-3-interpretation": {
    id: [
      "Compare summaries for each group before describing a cluster.",
      "Use domain context before giving a cluster a name.",
      "Treat clusters as patterns to inspect, not guaranteed truth.",
    ],
  },
  "exercise-hyperparameter-1-what-to-tune": {
    id: [
      "A hyperparameter is a model setting, not a learned coefficient.",
      "It is chosen before or around training.",
      "Changing it can make a model simpler, stricter, deeper, or more flexible.",
    ],
  },
  "exercise-hyperparameter-2-validation-search": {
    id: [
      "Validation data is the safer place to compare tuning choices.",
      "Train several candidate settings, then compare them with the same validation rule.",
      "The final test set should stay reserved for the final check.",
    ],
  },
  "exercise-hyperparameter-3-tuning-discipline": {
    id: [
      "Unlimited tuning can overfit the validation set.",
      "Record what was tried and why.",
      "Choose settings using evidence, not vibes.",
    ],
  },
} satisfies Record<string, ExerciseHintCopy>;

export function getLearningExerciseHints(
  exerciseId: string,
  locale: Locale,
  fallbackHints: string[] = [],
) {
  return [
    ...(learningHintGlossaryByExerciseId[exerciseId]?.[locale] ??
      learningHintGlossaryByExerciseId[exerciseId]?.id ??
      fallbackHints),
  ];
}
