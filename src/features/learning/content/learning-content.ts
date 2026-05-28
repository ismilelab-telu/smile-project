import type {
  ChoiceExerciseOption,
  LearningModule,
  LearningTrack,
  Lesson,
  MultipleChoiceExercise,
  OpenDatasetSourceExercise,
} from "../types";

const moduleIds = [
  "module-0-workflow-foundations",
  "module-1-data-understanding",
  "module-2-supervised-classification",
  "module-2-eda-regression",
  "module-7-unsupervised-clustering",
  "module-4-feature-preparation-leakage",
  "module-5-split-baseline",
  "module-8-hyperparameter-tuning",
  "module-9-closing",
] as const;

const moduleLessonIds = {
  "module-0-workflow-foundations": [
    "lesson-0-1-what-is-machine-learning",
    "lesson-0-2-machine-learning-in-ai",
    "lesson-0-3-core-components",
    "lesson-0-4-learning-types",
    "lesson-0-5-machine-learning-use-cases",
    "lesson-0-6-formulating-ml-problems",
  ],
  "module-1-data-understanding": [
    "lesson-1-1-ml-tools-libraries",
    "lesson-1-2-data-collecting",
    "lesson-1-3-data-loading",
    "lesson-1-4-cleaning-transformation",
    "lesson-1-5-exploratory-explanatory-analysis",
    "lesson-1-6-data-splitting",
    "lesson-1-7-modeling",
  ],
  "module-2-supervised-classification": [
    "lesson-2-classification-labels",
    "lesson-2-classification-probability",
    "lesson-2-classification-evaluation",
  ],
  "module-2-eda-regression": [
    "lesson-2-1-choose-chart",
    "lesson-2-2-read-target-distribution",
    "lesson-2-3-feature-target-relationship",
    "lesson-2-4-mark-outlier-candidate",
    "lesson-2-5-eda-conclusion",
    "lesson-6-1-fit-a-line",
    "lesson-6-2-linear-prediction",
    "lesson-6-3-residual",
    "lesson-6-4-error-metrics",
  ],
  "module-7-unsupervised-clustering": [
    "lesson-clustering-1-groups",
    "lesson-clustering-2-features",
    "lesson-clustering-3-interpretation",
  ],
  "module-4-feature-preparation-leakage": [
    "lesson-4-1-safe-features",
    "lesson-4-2-data-leakage",
    "lesson-4-3-weak-feature-representation",
    "lesson-4-4-safe-feature-engineering",
    "lesson-4-5-avoid-irrelevant-features",
  ],
  "module-5-split-baseline": [
    "lesson-5-1-why-train-test-split",
    "lesson-5-2-split-before-distribution-transform",
    "lesson-5-3-mean-baseline",
    "lesson-5-4-representative-split",
    "lesson-6-5-diagnose-underfitting",
    "lesson-6-6-retrain-with-feature-engineering",
  ],
  "module-8-hyperparameter-tuning": [
    "lesson-hyperparameter-1-what-to-tune",
    "lesson-hyperparameter-2-validation-search",
    "lesson-hyperparameter-3-tuning-discipline",
  ],
  "module-9-closing": ["lesson-6-7-model-conclusion"],
} satisfies Record<(typeof moduleIds)[number], string[]>;

export const machineLearningFoundationsTrack: LearningTrack = {
  id: "track-machine-learning-foundations",
  moduleIds: ["module-0-workflow-foundations", "module-1-data-understanding"],
  status: "available",
  title: "Dasar-Dasar Machine Learning",
};

export const regressionTrack: LearningTrack = {
  id: "track-regression",
  moduleIds: [],
  status: "coming-soon",
  title: "Regresi",
};

export const clusteringTrack: LearningTrack = {
  id: "track-clustering",
  moduleIds: [],
  status: "coming-soon",
  title: "Clustering",
};

export const classificationTrack: LearningTrack = {
  id: "track-classification",
  moduleIds: [],
  status: "coming-soon",
  title: "Klasifikasi",
};

export const learningTracks: LearningTrack[] = [
  machineLearningFoundationsTrack,
  regressionTrack,
  clusteringTrack,
  classificationTrack,
];

export const learningModules: LearningModule[] = [
  {
    id: "module-0-workflow-foundations",
    lessonIds: moduleLessonIds["module-0-workflow-foundations"],
    status: "available",
    summary:
      "Pahami apa itu machine learning, posisinya di AI, dan cara merumuskan masalah ML yang jelas.",
    title: "Halo, Machine Learning!",
  },
  {
    id: "module-1-data-understanding",
    lessonIds: moduleLessonIds["module-1-data-understanding"],
    status: "available",
    summary:
      "Mulai dari tool dan pengumpulan data, lalu masuk ke memuat data, pembersihan, analisis, pembagian data, dan pemodelan.",
    title: "Alur Kerja Machine Learning",
  },
  {
    id: "module-2-supervised-classification",
    lessonIds: moduleLessonIds["module-2-supervised-classification"],
    status: "available",
    summary: "Understand supervised learning when the answer is a category or class.",
    title: "Supervised Learning: Classification",
  },
  {
    id: "module-2-eda-regression",
    lessonIds: moduleLessonIds["module-2-eda-regression"],
    status: "available",
    summary: "Understand supervised learning when the answer is a number and errors are numeric.",
    title: "Supervised Learning: Regression",
  },
  {
    id: "module-7-unsupervised-clustering",
    lessonIds: moduleLessonIds["module-7-unsupervised-clustering"],
    status: "available",
    summary: "Group similar examples when there is no target column.",
    title: "Unsupervised Learning: Clustering",
  },
  {
    id: "module-4-feature-preparation-leakage",
    lessonIds: moduleLessonIds["module-4-feature-preparation-leakage"],
    status: "available",
    summary: "Choose safe features, avoid leakage, and introduce feature engineering.",
    title: "Feature Engineering Techniques",
  },
  {
    id: "module-5-split-baseline",
    lessonIds: moduleLessonIds["module-5-split-baseline"],
    status: "available",
    summary: "Use holdout data and model evidence to avoid models that memorize or miss patterns.",
    title: "Overfitting and Underfitting",
  },
  {
    id: "module-8-hyperparameter-tuning",
    lessonIds: moduleLessonIds["module-8-hyperparameter-tuning"],
    status: "available",
    summary: "Tune model settings without fooling yourself with test-set leakage.",
    title: "Hyperparameter Tuning",
  },
  {
    id: "module-9-closing",
    lessonIds: moduleLessonIds["module-9-closing"],
    status: "available",
    summary: "Close the foundations path with a responsible model conclusion.",
    title: "Closing",
  },
];

type MultipleChoiceLessonInput = {
  correctOptionIds: string[];
  estimatedMinutes: number;
  exerciseId: string;
  hints: string[];
  id: string;
  moduleId: LearningModule["id"];
  numberLabel: string;
  objective: string;
  options: ChoiceExerciseOption[];
  prompt: string;
  summary: string[];
  title: string;
};

function multipleChoiceLesson(input: MultipleChoiceLessonInput): Lesson {
  return {
    estimatedMinutes: input.estimatedMinutes,
    exercise: {
      correctOptionIds: input.correctOptionIds,
      hints: input.hints,
      id: input.exerciseId,
      options: input.options,
      prompt: input.prompt,
      type: "multiple-choice",
    },
    exerciseId: input.exerciseId,
    id: input.id,
    moduleId: input.moduleId,
    numberLabel: input.numberLabel,
    objective: input.objective,
    summary: input.summary,
    title: input.title,
  };
}

const lesson01: Lesson = multipleChoiceLesson({
  correctOptionIds: ["learn-from-data"],
  estimatedMinutes: 4,
  exerciseId: "exercise-0-1-what-is-machine-learning",
  hints: ["Cari pernyataan yang menyebut sistem belajar pola dari data untuk contoh baru."],
  id: "lesson-0-1-what-is-machine-learning",
  moduleId: "module-0-workflow-foundations",
  numberLabel: "Lesson 0.1",
  objective: "Kamu bisa menjelaskan machine learning sebagai sistem yang belajar pola dari data.",
  options: [
    {
      id: "manual-rules-only",
      label: "Komputer menjalankan daftar aturan tetap yang ditulis manusia untuk semua kondisi.",
    },
    {
      id: "learn-from-data",
      label:
        "Komputer belajar pola dari data agar dapat membuat prediksi, rekomendasi, atau keputusan untuk contoh baru.",
    },
    {
      id: "always-correct",
      label: "Komputer selalu menghasilkan jawaban benar karena sudah memakai kecerdasan buatan.",
    },
    {
      id: "no-data-needed",
      label: "Komputer tidak membutuhkan data karena model sudah mengetahui pola dari awal.",
    },
  ],
  prompt: "Pernyataan mana yang paling tepat menjelaskan machine learning?",
  summary: [
    "Machine learning adalah pendekatan dalam kecerdasan buatan yang membuat komputer belajar dari data.",
    "Alih-alih menulis aturan untuk setiap kondisi, kita memberi contoh, data, dan tujuan agar sistem mencari pola.",
    "Machine learning berguna ketika pola terlalu banyak, berubah-ubah, atau sulit ditulis sebagai aturan manual yang lengkap.",
  ],
  title: "Apa Itu Machine Learning",
});

const lesson02: Lesson = multipleChoiceLesson({
  correctOptionIds: ["ml-part-of-ai"],
  estimatedMinutes: 4,
  exerciseId: "exercise-0-2-machine-learning-in-ai",
  hints: [
    "Cari relasi payung: machine learning berada di dalam AI dan cara kerjanya belajar dari data.",
  ],
  id: "lesson-0-2-machine-learning-in-ai",
  moduleId: "module-0-workflow-foundations",
  numberLabel: "Lesson 0.2",
  objective: "Kamu bisa menempatkan machine learning di dalam peta besar AI.",
  options: [
    { id: "ai-ml-same", label: "AI dan machine learning adalah hal yang sama persis." },
    {
      id: "ml-part-of-ai",
      label: "Machine learning adalah bagian dari AI yang belajar dari data.",
    },
    {
      id: "dl-all-ai",
      label: "Deep learning selalu berarti semua jenis AI tanpa pengecualian.",
    },
    {
      id: "gen-ai-no-content",
      label: "Generative AI hanya bisa mengelompokkan data, bukan membuat konten baru.",
    },
  ],
  prompt: "Pernyataan mana yang paling akurat?",
  summary: [
    "Artificial Intelligence adalah payung besar untuk sistem yang melakukan tugas yang biasanya membutuhkan kecerdasan manusia.",
    "Machine learning adalah bagian dari AI yang membuat sistem belajar dari data.",
    "Neural network, deep learning, dan generative AI berada di dalam peta AI modern, tetapi tidak semuanya sama dengan machine learning.",
  ],
  title: "Posisi Machine Learning dalam AI",
});

const lesson03: Lesson = multipleChoiceLesson({
  correctOptionIds: ["problem", "data", "model", "training", "evaluation"],
  estimatedMinutes: 5,
  exerciseId: "exercise-0-3-core-components",
  hints: [
    "Mulai dari kebutuhan atau tugas yang ingin diselesaikan; tanpa ini model tidak punya arah.",
    "Contoh historis menjadi bahan belajar, bukan sekadar pelengkap laporan.",
    "Bagian yang menyimpan pola hasil belajar adalah model.",
    "Proses belajar terjadi saat model disesuaikan dari contoh.",
    "Komponen akhir memeriksa apakah hasil model benar-benar berguna.",
  ],
  id: "lesson-0-3-core-components",
  moduleId: "module-0-workflow-foundations",
  numberLabel: "Lesson 0.3",
  objective: "Kamu bisa mengenali komponen dasar dalam proyek machine learning.",
  options: [
    { id: "problem", label: "Masalah atau tugas yang ingin diselesaikan." },
    { id: "data", label: "Data sebagai contoh untuk belajar." },
    { id: "model", label: "Model yang belajar pola dari data." },
    { id: "training", label: "Pelatihan untuk menyesuaikan model." },
    { id: "evaluation", label: "Evaluasi untuk menilai manfaat model." },
    { id: "guessing", label: "Menebak hasil tanpa data karena model selalu tahu jawabannya." },
  ],
  prompt: "Mana saja yang termasuk komponen dasar dalam machine learning?",
  summary: [
    "Machine learning bukan hanya memilih algoritma. Proyek ML dimulai dari masalah yang jelas.",
    "Data memberi contoh, model belajar pola, pelatihan menyesuaikan model, dan prediksi memakai model untuk contoh baru.",
    "Evaluasi mengecek apakah model benar-benar membantu dan tidak hanya terlihat bagus pada contoh awal.",
  ],
  title: "Komponen Utama dalam Machine Learning",
});

const lesson04: Lesson = multipleChoiceLesson({
  correctOptionIds: [
    "regression-number",
    "classification-category",
    "clustering-groups",
    "rl-reward",
  ],
  estimatedMinutes: 5,
  exerciseId: "exercise-0-4-learning-types",
  hints: [
    "Output berupa angka mengarah ke regresi.",
    "Output berupa kategori mengarah ke klasifikasi.",
    "Mencari kelompok tanpa label jawaban mengarah ke clustering.",
    "Belajar memilih tindakan dari reward mengarah ke reinforcement learning.",
  ],
  id: "lesson-0-4-learning-types",
  moduleId: "module-0-workflow-foundations",
  numberLabel: "Lesson 0.4",
  objective: "Kamu bisa membedakan jenis-jenis machine learning pada level peta awal.",
  options: [
    { id: "regression-number", label: "Regresi memprediksi nilai numerik." },
    { id: "classification-category", label: "Klasifikasi memprediksi kategori." },
    { id: "clustering-groups", label: "Clustering mengelompokkan data tanpa label jawaban." },
    { id: "rl-reward", label: "Reinforcement learning belajar dari reward atas tindakan." },
    {
      id: "unsupervised-target",
      label: "Unsupervised learning selalu membutuhkan target yang sudah benar.",
    },
  ],
  prompt: "Pasangan mana yang benar?",
  summary: [
    "Supervised learning memakai contoh yang sudah memiliki jawaban. Regresi memprediksi angka, sedangkan klasifikasi memprediksi kategori.",
    "Unsupervised learning memakai data tanpa target untuk mencari struktur, seperti clustering.",
    "Reinforcement learning melatih agen memilih tindakan berdasarkan reward.",
  ],
  title: "Jenis-Jenis Machine Learning",
});

const lesson05: Lesson = multipleChoiceLesson({
  correctOptionIds: ["forecast-demand", "customer-segments", "detect-risk"],
  estimatedMinutes: 5,
  exerciseId: "exercise-0-5-machine-learning-use-cases",
  hints: [
    "Masalah estimasi durasi dari jarak, cuaca, trafik, dan kendaraan cocok untuk prediksi berbasis pola.",
    "Kelompok pelanggan dari riwayat perilaku adalah tugas mencari segmen.",
    "Risiko transaksi bisa dipelajari dari pola kasus sebelumnya jika data tersedia.",
  ],
  id: "lesson-0-5-machine-learning-use-cases",
  moduleId: "module-0-workflow-foundations",
  numberLabel: "Lesson 0.5",
  objective: "Kamu bisa mengenali kapan machine learning masuk akal dipakai.",
  options: [
    {
      id: "forecast-demand",
      label: "Memprediksi waktu pengiriman makanan dari jarak, cuaca, trafik, dan kendaraan.",
    },
    { id: "customer-segments", label: "Mengelompokkan pelanggan berdasarkan pola pembelian." },
    { id: "fixed-total", label: "Menghitung total belanja dengan rumus harga dikali jumlah." },
    { id: "detect-risk", label: "Mendeteksi transaksi berisiko dari pola transaksi sebelumnya." },
    { id: "fixed-alarm", label: "Menyalakan alarm pada jam yang selalu sama setiap hari." },
  ],
  prompt: "Kasus penggunaan mana yang paling masuk akal untuk machine learning?",
  summary: [
    "Machine learning kuat ketika masalah memiliki pola yang bisa dipelajari dari contoh.",
    "Kasus penggunaan ML biasanya membutuhkan prediksi, pengelompokan, rekomendasi, deteksi risiko, atau prioritas.",
    "Jika masalah bisa diselesaikan dengan aturan sederhana yang stabil, machine learning bisa menjadi berlebihan.",
  ],
  title: "Kasus Penggunaan Machine Learning",
});

const lesson06ProblemExercise = {
  correctOptionIds: ["target-demand", "regression-task", "safe-features", "clear-statement"],
  hints: [
    "Jawaban yang ingin keluar dari model adalah durasi pengiriman.",
    "Karena outputnya angka, jenis tugasnya regresi.",
    "Input yang aman adalah konteks order yang sudah diketahui sebelum pengiriman selesai.",
    "Rumusan masalah harus menyebut output dan konteks inputnya dalam satu kalimat.",
  ],
  id: "exercise-0-6-formulate-problem",
  options: [
    {
      id: "target-demand",
      label: "Target yang masuk akal adalah waktu pengiriman dalam menit.",
    },
    {
      id: "regression-task",
      label: "Jenis masalah yang masuk akal adalah regresi karena output berupa angka.",
    },
    {
      id: "safe-features",
      label:
        "Fitur yang aman bisa mencakup jarak, cuaca, level trafik, waktu hari, jenis kendaraan, waktu persiapan, dan pengalaman kurir.",
    },
    {
      id: "actual-demand-feature",
      label: "Fitur terbaik adalah waktu pengiriman aktual yang ingin diprediksi.",
    },
    {
      id: "clear-statement",
      label:
        "Pernyataan masalah yang jelas: memprediksi durasi pengiriman makanan dari konteks order dan pengiriman.",
    },
  ],
  prompt:
    "Tim food delivery ingin memperkirakan berapa menit sebuah order sampai ke pelanggan. Pilihan mana yang tepat untuk merumuskan masalah ML-nya?",
  type: "multiple-choice" as const,
};

const lesson06ColumnRoleExercise = {
  datasetContext:
    "Tim food delivery ingin memprediksi waktu pengiriman order dalam menit dari konteks pengiriman.",
  hints: [
    "Target adalah output yang ingin diprediksi.",
    "Fitur harus tersedia sebelum waktu prediksi.",
    "ID biasanya metadata.",
    "Informasi yang baru diketahui setelah kejadian selesai tidak aman dipakai sebagai fitur.",
  ],
  id: "exercise-0-6-select-feature-target",
  instruction: "Pilih satu target, fitur yang aman, metadata, dan kolom yang belum dipakai.",
  prompt: "Pilih target dan fitur dari tabel pengiriman makanan.",
  type: "table-column-role-assignment" as const,
};

const lesson06: Lesson = {
  datasetId: "dataset-food-delivery-time-intro",
  estimatedMinutes: 8,
  exercise: lesson06ProblemExercise,
  exerciseId: lesson06ProblemExercise.id,
  exercises: [lesson06ProblemExercise, lesson06ColumnRoleExercise],
  id: "lesson-0-6-formulating-ml-problems",
  moduleId: "module-0-workflow-foundations",
  numberLabel: "Lesson 0.6",
  objective:
    "Kamu bisa merumuskan masalah ML dengan target, fitur, waktu prediksi, dan jenis masalah yang jelas.",
  summary: [
    "Proyek machine learning yang baik dimulai dari masalah yang jelas dan output yang ingin dihasilkan model.",
    "Dalam supervised learning, target adalah nilai atau kategori yang ingin diprediksi, sedangkan fitur adalah informasi yang dipakai model sebagai input.",
    "Fitur harus tersedia saat prediksi dibuat. Informasi yang baru diketahui setelah kejadian selesai tidak aman dipakai sebagai fitur.",
  ],
  title: "Merumuskan Masalah dalam Machine Learning",
  viewId: "intro-table-preview",
};

const lesson12DecisionExercise: MultipleChoiceExercise = {
  correctOptionIds: [
    "define-question",
    "capture-source",
    "check-permission",
    "check-representation",
  ],
  hints: [
    "Mulai dari output prediksi, unit baris, dan batas data yang dibutuhkan model.",
    "Asal sumber, periode, dan cara data diambil harus bisa dilacak.",
    "Izin, privasi, dan batas pakai field perlu dicek sebelum data dipakai.",
    "Data harus mencakup variasi kondisi yang akan dihadapi model.",
  ],
  id: "exercise-1-2-data-collecting",
  options: [
    {
      id: "define-question",
      label: "Tetapkan output prediksi, unit baris, dan cakupan data.",
    },
    {
      id: "capture-source",
      label: "Catat asal sumber, periode data, dan cara pengambilannya.",
    },
    {
      id: "check-permission",
      label: "Cek izin, privasi, dan batasan pemakaian field.",
    },
    {
      id: "check-representation",
      label: "Pastikan variasi jarak, cuaca, trafik, waktu hari, kendaraan, dan kurir terwakili.",
    },
    {
      id: "collect-everything",
      label: "Ambil kolom sebanyak mungkin; tujuan bisa diputuskan nanti.",
    },
    {
      id: "single-segment",
      label: "Pakai satu sumber termudah meski segmennya sempit.",
    },
  ],
  prompt:
    "Tim food delivery ingin membangun model estimasi waktu pengiriman dari data order. Keputusan awal mana yang paling sehat?",
  type: "multiple-choice",
};

const lesson12OpenSourceExercise: OpenDatasetSourceExercise = {
  hints: [
    "Gunakan dataset Food Delivery Time Prediction dari Kaggle sebagai sumber latihan utama.",
    "Baca halaman dataset sebelum submit, bukan hanya menyalin link.",
    "Bagian Tentang dataset bisa terisi otomatis dari halaman sumber; jika tidak, isi manual dari deskripsi dataset.",
  ],
  id: "exercise-1-2-open-source-data-search",
  introParagraphs: [
    "Untuk latihan awal, kita tidak selalu perlu membuat dataset sendiri dari nol. Banyak proyek pembelajaran machine learning memakai dataset terbuka dari platform publik agar kita bisa fokus memahami masalah, struktur data, dan kualitas data.",
    "Dataset terbuka tetap perlu diperiksa. Dataset yang mudah diunduh belum tentu cocok untuk masalah kita, apalagi jika target, fitur, periode, atau izin penggunaannya tidak jelas.",
  ],
  introTitle: "Mengumpulkan Data dari Sumber Terbuka",
  minimumCompleteSources: 1,
  minimumDistinctDomains: 1,
  notesLabel: "Tentang dataset",
  prompt: "Validasi dataset terbuka untuk kasus prediksi waktu pengiriman makanan.",
  sourceGuidance: [
    {
      description:
        "Gunakan halaman Kaggle Food Delivery Time Prediction agar target dan fitur selaras dengan seluruh lesson.",
      examples: ["Kaggle Food Delivery Time Prediction"],
      id: "dataset-repository",
      title: "Repositori dataset",
    },
    {
      description:
        "Gunakan dokumentasi halaman dataset untuk membaca definisi kolom, periode, lisensi, dan batasan penggunaan.",
      examples: ["halaman dataset", "data card", "README", "license note"],
      id: "dataset-documentation",
      title: "Dokumentasi dataset",
    },
  ],
  sourceGuidanceTitle: "Yang perlu dicek dari dataset food delivery",
  sourceInputs: [
    {
      description:
        "Tempel link dataset Food Delivery Time Prediction. Jika halaman terbaca, bagian Tentang dataset akan diisi otomatis.",
      id: "demand-source",
      label: "Dataset food delivery",
      notesPlaceholder:
        "Akan terisi otomatis dari halaman dataset jika terbaca. Jika tidak, tulis ringkasan About Dataset di sini.",
      urlPlaceholder:
        "https://www.kaggle.com/datasets/denkuznetz/food-delivery-time-prediction/data",
    },
  ],
  taskDescription:
    "Tempel link dataset Food Delivery Time Prediction dari Kaggle; sistem akan mencoba membaca bagian About Dataset dan memindahkannya ke field Tentang dataset.",
  taskTitle: "Tugas pencarian",
  type: "open-dataset-source",
  urlLabel: "Link dataset atau halaman data",
};

const lesson12: Lesson = {
  estimatedMinutes: 12,
  exercise: lesson12DecisionExercise,
  exerciseId: lesson12DecisionExercise.id,
  exercises: [lesson12DecisionExercise, lesson12OpenSourceExercise],
  id: "lesson-1-2-data-collecting",
  moduleId: "module-1-data-understanding",
  numberLabel: "Lesson 1.2",
  objective: "Kamu bisa menentukan kebutuhan, sumber, izin, dan cek awal data untuk proyek ML.",
  summary: [
    "Pengumpulan data menentukan apakah model belajar dari contoh yang relevan, cukup, aman, dan punya konteks.",
    "Sumber data bisa internal, eksternal, sintetis, atau berasal dari pengguna; tiap sumber perlu dicek izin, cakupan, dan risikonya.",
    "Sebelum data dipakai, catat konteks dan lakukan validasi awal agar bias, field hilang, atau batasan penggunaan tidak terlambat ditemukan.",
  ],
  title: "Pengumpulan Data",
};

const laterLessons: Lesson[] = [
  multipleChoiceLesson({
    correctOptionIds: [
      "start-notebook",
      "inspect-with-pandas",
      "visualize-before-modeling",
      "baseline-with-scikit-learn",
    ],
    estimatedMinutes: 5,
    exerciseId: "exercise-1-1-ml-tools-libraries",
    hints: [
      "Notebook membantu jejak eksperimen tetap bisa diaudit.",
      "Pandas cocok untuk membaca sampel, tipe kolom, dan nilai kosong.",
      "Grafik ringkas membantu melihat pola target sebelum model dilatih.",
      "Scikit-learn cocok untuk baseline sederhana yang jadi pembanding awal.",
    ],
    id: "lesson-1-1-ml-tools-libraries",
    moduleId: "module-1-data-understanding",
    numberLabel: "Lesson 1.1",
    objective: "Kamu bisa mengenali peran tool dasar dalam alur kerja machine learning.",
    options: [
      {
        id: "start-notebook",
        label: "Simpan jejak eksperimen di notebook.",
      },
      {
        id: "inspect-with-pandas",
        label: "Audit sampel, tipe kolom, dan nilai kosong dengan Pandas.",
      },
      {
        id: "visualize-before-modeling",
        label: "Baca pola target lewat grafik ringkas.",
      },
      {
        id: "baseline-with-scikit-learn",
        label: "Buat pembanding sederhana di Scikit-learn.",
      },
      {
        id: "deep-learning-first",
        label: "Langsung pakai TensorFlow karena outputnya angka.",
      },
      {
        id: "skip-data-check",
        label: "Coba model dulu, eksplorasi data belakangan.",
      },
    ],
    prompt:
      "Tim food delivery butuh model awal untuk memperkirakan waktu pengiriman dari data order. Keputusan awal mana yang paling sehat?",
    summary: [
      "Pekerjaan machine learning biasanya menggabungkan lingkungan eksperimen, tool data, dan tool pemodelan.",
      "Tool tidak menggantikan pemahaman. Tool membantu memuat data, memeriksa data, menyiapkan data, melatih model, dan mengevaluasi hasil secara konsisten.",
    ],
    title: "Tool dan Library ML",
  }),
  lesson12,
  multipleChoiceLesson({
    correctOptionIds: ["read-into-table", "check-schema", "preview-rows"],
    estimatedMinutes: 5,
    exerciseId: "exercise-1-3-data-loading",
    hints: [
      "Tahap awal memindahkan sumber mentah ke tabel atau dataframe yang bisa diperiksa.",
      "Nama kolom, tipe data, dan field wajib perlu divalidasi setelah data masuk.",
      "Melihat beberapa baris membantu menangkap masalah loading yang kasar.",
    ],
    id: "lesson-1-3-data-loading",
    moduleId: "module-1-data-understanding",
    numberLabel: "Lesson 1.3",
    objective: "Kamu bisa menjelaskan apa yang perlu dicek saat data dimuat ke project.",
    options: [
      { id: "read-into-table", label: "Membaca sumber data menjadi tabel atau dataframe." },
      { id: "check-schema", label: "Memeriksa nama kolom, tipe data, dan field yang diharapkan." },
      { id: "preview-rows", label: "Melihat beberapa baris sebelum bekerja lebih jauh." },
      { id: "train-immediately", label: "Langsung melatih model setelah membuka file." },
    ],
    prompt: "Aksi mana yang termasuk tahap memuat data?",
    summary: [
      "Tahap memuat data membawa data mentah ke bentuk yang bisa diperiksa project.",
      "Sebelum pembersihan atau pemodelan, pastikan tabel termuat dengan benar: baris ada, kolom sesuai ekspektasi, dan tipe data tidak mengejutkan.",
    ],
    title: "Memuat Data",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["handle-missing", "standardize-values", "create-safe-fields"],
    estimatedMinutes: 6,
    exerciseId: "exercise-1-4-cleaning-transformation",
    hints: [
      "Nilai kosong atau mustahil perlu ditangani dengan alasan yang jelas.",
      "Kategori atau format yang tidak konsisten perlu diseragamkan.",
      "Field baru hanya aman jika tidak memakai jawaban target atau informasi masa depan.",
    ],
    id: "lesson-1-4-cleaning-transformation",
    moduleId: "module-1-data-understanding",
    numberLabel: "Lesson 1.4",
    objective: "Kamu bisa membedakan pembersihan, transformasi, dan shortcut yang berisiko.",
    options: [
      {
        id: "handle-missing",
        label: "Menangani nilai kosong atau nilai mustahil dengan alasan jelas.",
      },
      {
        id: "standardize-values",
        label: "Menstandarkan kategori atau format yang tidak konsisten.",
      },
      {
        id: "create-safe-fields",
        label: "Membuat field hasil transformasi tanpa memakai informasi target dari masa depan.",
      },
      {
        id: "change-target-after-model",
        label: "Mengubah definisi target setelah melihat model mana yang menang.",
      },
    ],
    prompt: "Aksi mana yang termasuk pembersihan dan transformasi data?",
    summary: [
      "Pembersihan membuat dataset lebih bisa dipercaya dengan menangani nilai kosong, tidak konsisten, duplikat, atau mustahil.",
      "Transformasi mengubah informasi yang bisa dipakai menjadi field yang lebih jelas sambil menghindari kebocoran target atau data masa depan.",
    ],
    title: "Pembersihan dan Transformasi Data",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["explore-patterns", "explain-findings", "avoid-overclaiming"],
    estimatedMinutes: 6,
    exerciseId: "exercise-1-5-exploratory-explanatory-analysis",
    hints: [
      "Eksplorasi mencari pola, gap, dan pertanyaan lanjutan dari data.",
      "Eksplanasi menyajikan temuan terpilih agar orang lain memahami klaimnya.",
      "Klaim analisis harus berhenti di bukti yang tersedia.",
    ],
    id: "lesson-1-5-exploratory-explanatory-analysis",
    moduleId: "module-1-data-understanding",
    numberLabel: "Lesson 1.5",
    objective: "Kamu bisa membedakan eksplorasi dan eksplanasi dalam analisis data.",
    options: [
      {
        id: "explore-patterns",
        label: "Menggunakan analisis eksploratif untuk mencari pola dan masalah.",
      },
      {
        id: "explain-findings",
        label: "Menggunakan analisis eksplanatori untuk menyampaikan temuan yang jelas.",
      },
      { id: "avoid-overclaiming", label: "Tidak membuat klaim yang melebihi bukti." },
      {
        id: "prove-causation",
        label: "Menggunakan satu chart untuk membuktikan penyebab semua outcome.",
      },
    ],
    prompt: "Pernyataan mana yang menggambarkan analisis eksploratif dan eksplanatori?",
    summary: [
      "Analisis eksploratif adalah tahap memeriksa distribusi, hubungan, gap, dan hal yang mengejutkan.",
      "Analisis eksplanatori mengubah temuan terpilih menjadi komunikasi yang jelas dengan klaim yang sesuai bukti.",
    ],
    title: "Analisis Eksploratif dan Eksplanatori",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["train-test-holdout", "split-before-learning", "representative-split"],
    estimatedMinutes: 5,
    exerciseId: "exercise-1-6-data-splitting",
    hints: [
      "Data uji perlu ditahan sebagai perkiraan data baru yang belum dilihat.",
      "Split dilakukan sebelum transformasi atau model belajar dari data.",
      "Train dan test tetap perlu mewakili kondisi masalah nyata.",
    ],
    id: "lesson-1-6-data-splitting",
    moduleId: "module-1-data-understanding",
    numberLabel: "Lesson 1.6",
    objective: "Kamu bisa menjelaskan kenapa dan kapan data perlu dibagi.",
    options: [
      {
        id: "train-test-holdout",
        label: "Menyisihkan test data untuk memperkirakan performa pada data baru.",
      },
      {
        id: "split-before-learning",
        label: "Melakukan split sebelum fitting transformasi atau model.",
      },
      { id: "representative-split", label: "Memeriksa apakah split masih mewakili masalah nyata." },
      {
        id: "tune-on-test",
        label: "Memakai test data berulang kali untuk memilih semua keputusan modeling.",
      },
    ],
    prompt: "Pilihan mana yang membuat pembagian data berguna?",
    summary: [
      "Pembagian data menjaga evaluasi agar tidak terlalu optimistis.",
      "Data latih dipakai untuk belajar. Data uji ditahan agar hasil akhir lebih menggambarkan perilaku model pada contoh baru.",
    ],
    title: "Membagi Data",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["choose-baseline", "train-model", "evaluate-errors"],
    estimatedMinutes: 6,
    exerciseId: "exercise-1-7-modeling",
    hints: [
      "Baseline memberi pembanding sederhana untuk menilai model.",
      "Model belajar saat dilatih memakai data latih.",
      "Evaluasi melihat error dan batasan, bukan sekadar satu skor.",
    ],
    id: "lesson-1-7-modeling",
    moduleId: "module-1-data-understanding",
    numberLabel: "Lesson 1.7",
    objective:
      "Kamu bisa menempatkan pemodelan sebagai satu tahap dalam alur kerja ML yang lebih luas.",
    options: [
      { id: "choose-baseline", label: "Membandingkan model dengan baseline sederhana." },
      { id: "train-model", label: "Melatih model menggunakan training data." },
      {
        id: "evaluate-errors",
        label: "Mengevaluasi error, batasan, dan apakah model benar-benar membantu.",
      },
      { id: "complex-first", label: "Memulai dari model paling kompleks dan melewati baseline." },
    ],
    prompt: "Aksi mana yang termasuk tahap pemodelan?",
    summary: [
      "Pemodelan adalah tahap ketika algoritma belajar pola dari data latih.",
      "Tahap pemodelan yang baik dimulai dari baseline, melatih kandidat model, lalu mengevaluasi apakah model benar-benar berguna untuk masalahnya.",
    ],
    title: "Pemodelan",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["fixed-label-set", "category-output", "supervised-examples"],
    estimatedMinutes: 5,
    exerciseId: "exercise-2-classification-labels",
    hints: [
      "Look for a target that comes from a limited list of allowed labels.",
      "The output is a category decision, not a numeric quantity.",
      "Training rows already include the correct label.",
    ],
    id: "lesson-2-classification-labels",
    moduleId: "module-2-supervised-classification",
    numberLabel: "Lesson 2.1",
    objective: "You can recognize classification problems from their target shape.",
    options: [
      { id: "fixed-label-set", label: "The target comes from a fixed set of labels." },
      {
        id: "category-output",
        label: "The model output is a category such as yes/no or class A/B.",
      },
      { id: "supervised-examples", label: "Training examples include the correct label." },
      { id: "numeric-demand", label: "The model predicts an exact delivery time in minutes." },
    ],
    prompt: "Which statements describe supervised classification?",
    summary: [
      "Classification is supervised learning for category targets.",
      "Instead of predicting a number, the model chooses from labels such as churn/not churn, hot/iced/blended, or approved/rejected.",
    ],
    title: "Class Labels",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["confidence-score", "threshold-choice", "not-guarantee"],
    estimatedMinutes: 5,
    exerciseId: "exercise-2-classification-probability",
    hints: [
      "Some classifiers output a score per class before the final decision.",
      "A cutoff converts the score into a chosen label.",
      "A high score is evidence, but it is not a guarantee.",
    ],
    id: "lesson-2-classification-probability",
    moduleId: "module-2-supervised-classification",
    numberLabel: "Lesson 2.2",
    objective: "You can interpret classification scores before they become labels.",
    options: [
      { id: "confidence-score", label: "A classifier may output a score for each class." },
      {
        id: "threshold-choice",
        label: "A threshold can decide when a score becomes a positive label.",
      },
      { id: "not-guarantee", label: "A 0.90 score is strong evidence, not a promise." },
      {
        id: "same-as-regression",
        label: "Classification scores are the same as predicting delivery minutes.",
      },
    ],
    prompt: "Which statements about classification scores are correct?",
    summary: [
      "Classification often has two layers: scores and final labels.",
      "Changing the decision threshold can change how many examples are marked positive or negative.",
    ],
    title: "Scores and Thresholds",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["confusion-matrix", "precision-recall", "class-balance"],
    estimatedMinutes: 6,
    exerciseId: "exercise-2-classification-evaluation",
    hints: [
      "A predicted-versus-actual label table reveals which classes are confused.",
      "Precision and recall focus on different error costs.",
      "Class balance must be checked before trusting accuracy alone.",
    ],
    id: "lesson-2-classification-evaluation",
    moduleId: "module-2-supervised-classification",
    numberLabel: "Lesson 2.3",
    objective: "You can choose basic evaluation tools for classification.",
    options: [
      { id: "confusion-matrix", label: "Use a confusion matrix to inspect class mistakes." },
      { id: "precision-recall", label: "Use precision and recall when mistake types matter." },
      { id: "class-balance", label: "Check class balance before trusting accuracy alone." },
      { id: "mae-only", label: "Use MAE as the main metric for every classification task." },
    ],
    prompt: "Which classification evaluation habits are useful?",
    summary: [
      "Classification evaluation is about labels and mistakes between labels.",
      "Accuracy is not always enough; the cost of false positives and false negatives can be very different.",
    ],
    title: "Classification Evaluation",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["no-target", "similarity-groups", "exploration-tool"],
    estimatedMinutes: 5,
    exerciseId: "exercise-clustering-1-groups",
    hints: [
      "Clustering does not start with a target column.",
      "The goal is to find groups of similar examples.",
      "Clusters are a way to explore structure, not final truth by default.",
    ],
    id: "lesson-clustering-1-groups",
    moduleId: "module-7-unsupervised-clustering",
    numberLabel: "Lesson 4.1",
    objective: "You can explain why clustering is unsupervised learning.",
    options: [
      { id: "no-target", label: "The dataset has no target label to predict." },
      { id: "similarity-groups", label: "The model groups examples that look similar." },
      { id: "exploration-tool", label: "Clusters help explore possible structure in data." },
      { id: "known-answer", label: "Clustering needs the correct class for every row." },
    ],
    prompt: "Which statements describe clustering?",
    summary: [
      "Clustering is unsupervised learning: it searches for groups without a target answer.",
      "A cluster is useful when it helps people understand patterns, segments, or behaviors worth investigating.",
    ],
    title: "What Clustering Does",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["meaningful-features", "scaling-matters", "avoid-ids"],
    estimatedMinutes: 5,
    exerciseId: "exercise-clustering-2-features",
    hints: [
      "Clustering depends heavily on the features used to measure similarity.",
      "Large-scale numeric columns can dominate distance-based methods.",
      "IDs usually create fake uniqueness instead of useful similarity.",
    ],
    id: "lesson-clustering-2-features",
    moduleId: "module-7-unsupervised-clustering",
    numberLabel: "Lesson 4.2",
    objective: "You can choose safer inputs for a clustering task.",
    options: [
      { id: "meaningful-features", label: "Use features that describe meaningful similarity." },
      { id: "scaling-matters", label: "Scale numeric features when distance matters." },
      { id: "avoid-ids", label: "Avoid using row IDs as clustering signals." },
      { id: "target-required", label: "Always include the target column for clustering." },
    ],
    prompt: "Which feature choices support useful clustering?",
    summary: [
      "Clustering quality depends on how similarity is defined.",
      "Good clustering inputs describe the behavior or object being grouped, not bookkeeping columns.",
    ],
    title: "Cluster Features",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["inspect-profiles", "use-context", "avoid-overclaiming"],
    estimatedMinutes: 5,
    exerciseId: "exercise-clustering-3-interpretation",
    hints: [
      "Compare summaries for each group before describing a cluster.",
      "Use domain context before giving a cluster a name.",
      "Treat clusters as patterns to inspect, not guaranteed truth.",
    ],
    id: "lesson-clustering-3-interpretation",
    moduleId: "module-7-unsupervised-clustering",
    numberLabel: "Lesson 4.3",
    objective: "You can interpret clusters without overclaiming.",
    options: [
      { id: "inspect-profiles", label: "Compare feature summaries for each cluster." },
      { id: "use-context", label: "Use domain context before naming clusters." },
      {
        id: "avoid-overclaiming",
        label: "Treat clusters as patterns to inspect, not guaranteed truth.",
      },
      { id: "cluster-id-truth", label: "A cluster number fully explains every row inside it." },
    ],
    prompt: "Which cluster interpretation habits are sound?",
    summary: [
      "A clustering model returns groups, but humans still need to interpret what those groups mean.",
      "A good cluster explanation is based on summaries, examples, and context.",
    ],
    title: "Interpreting Clusters",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["model-setting", "set-before-training", "changes-behavior"],
    estimatedMinutes: 5,
    exerciseId: "exercise-hyperparameter-1-what-to-tune",
    hints: [
      "A hyperparameter is a model setting, not a learned coefficient.",
      "It is chosen before or around training.",
      "Changing it can make a model simpler, stricter, deeper, or more flexible.",
    ],
    id: "lesson-hyperparameter-1-what-to-tune",
    moduleId: "module-8-hyperparameter-tuning",
    numberLabel: "Lesson 7.1",
    objective: "You can distinguish hyperparameters from learned model values.",
    options: [
      { id: "model-setting", label: "A hyperparameter is a model setting." },
      { id: "set-before-training", label: "It is selected before evaluating the final model." },
      { id: "changes-behavior", label: "It can change how flexible or strict the model is." },
      { id: "target-value", label: "It is the target value the model predicts." },
    ],
    prompt: "Which statements describe hyperparameters?",
    summary: [
      "Hyperparameters are knobs that control how an algorithm trains or behaves.",
      "Tuning is useful, but it must be evaluated carefully so the model does not just chase validation noise.",
    ],
    title: "What Hyperparameters Tune",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["validation-set", "compare-candidates", "keep-test-final"],
    estimatedMinutes: 6,
    exerciseId: "exercise-hyperparameter-2-validation-search",
    hints: [
      "Validation data is the safer place to compare tuning choices.",
      "Train several candidate settings, then compare them with the same validation rule.",
      "The final test set should stay reserved for the final check.",
    ],
    id: "lesson-hyperparameter-2-validation-search",
    moduleId: "module-8-hyperparameter-tuning",
    numberLabel: "Lesson 7.2",
    objective: "You can describe a safer tuning workflow.",
    options: [
      { id: "validation-set", label: "Use validation data to compare settings." },
      { id: "compare-candidates", label: "Train and compare several candidate settings." },
      { id: "keep-test-final", label: "Keep test data for the final evaluation." },
      { id: "test-every-time", label: "Use the test set after every small tuning change." },
    ],
    prompt: "Which tuning workflow choices avoid test-set leakage?",
    summary: [
      "Hyperparameter search needs an honest comparison process.",
      "Validation data is for choosing settings; test data is for the final estimate after choices are made.",
    ],
    title: "Validation Search",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["limit-search", "track-results", "prefer-evidence"],
    estimatedMinutes: 5,
    exerciseId: "exercise-hyperparameter-3-tuning-discipline",
    hints: [
      "Unlimited tuning can overfit the validation set.",
      "Record what was tried and why.",
      "Choose settings using evidence, not vibes.",
    ],
    id: "lesson-hyperparameter-3-tuning-discipline",
    moduleId: "module-8-hyperparameter-tuning",
    numberLabel: "Lesson 7.3",
    objective: "You can tune models without turning the process into guesswork.",
    options: [
      { id: "limit-search", label: "Keep the search space intentional and bounded." },
      { id: "track-results", label: "Record candidate settings and validation results." },
      { id: "prefer-evidence", label: "Choose settings based on validation evidence." },
      { id: "change-randomly", label: "Keep changing settings until the result feels lucky." },
    ],
    prompt: "Which tuning habits are responsible?",
    summary: [
      "Tuning is a disciplined experiment, not random knob twisting.",
      "A useful tuning run records candidates, evidence, and the final reason for choosing a setting.",
    ],
    title: "Tuning Discipline",
  }),
  multipleChoiceLesson({
    correctOptionIds: [
      "listing-id-text",
      "district-categorical",
      "area-numeric",
      "price-numeric-target",
    ],
    estimatedMinutes: 6,
    exerciseId: "exercise-1-1-classify-column-types",
    hints: [
      "An identifier can be stored as text because arithmetic on it has no meaning.",
      "A traffic level names a group or category.",
      "Distance supports numeric arithmetic such as averages and differences.",
      "A delivery-time target is still numeric because its values are measured in minutes.",
    ],
    id: "lesson-1-1-column-types",
    moduleId: "module-1-data-understanding",
    numberLabel: "Lesson 1.1",
    objective: "You can classify common column types in a small food delivery dataset.",
    options: [
      { id: "listing-id-text", label: "order_id is a text identifier." },
      { id: "district-categorical", label: "traffic_level is categorical." },
      { id: "area-numeric", label: "distance_km is numeric." },
      { id: "parking-boolean", label: "vehicle_type is boolean." },
      { id: "price-numeric-target", label: "delivery_time_min is a numeric target." },
      { id: "district-numeric", label: "traffic_level is numeric." },
      { id: "listing-id-target", label: "order_id is the target." },
    ],
    prompt: "Which column type statements are correct?",
    summary: [
      "Column type affects how data can be inspected, cleaned, visualized, and modeled.",
      "Numeric columns support arithmetic and distributions. Categorical columns describe groups. Boolean columns represent two-state values.",
    ],
    title: "Column Types",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["district", "property-type", "building-area", "bedrooms"],
    estimatedMinutes: 5,
    exerciseId: "exercise-1-2-prediction-time-availability",
    hints: [
      "Distance is known before the delivery finishes.",
      "Traffic level is context available at prediction time.",
      "Weather can be used when it is known before the estimate is made.",
      "Vehicle type is chosen before delivery and can help estimate duration.",
    ],
    id: "lesson-1-2-target-context",
    moduleId: "module-1-data-understanding",
    numberLabel: "Lesson 1.2",
    objective: "You can decide which fields are available at prediction time.",
    options: [
      { id: "district", label: "Distance in kilometers." },
      { id: "property-type", label: "Traffic level." },
      { id: "building-area", label: "Weather." },
      { id: "bedrooms", label: "Vehicle type." },
      { id: "price", label: "Final delivery time." },
    ],
    prompt: "Which fields are safe features for forecasting delivery time?",
    summary: [
      "A target must be clearly defined before modeling starts.",
      "Features must be available before the prediction is made. Information only known after the target happens can create leakage.",
    ],
    title: "Target Context",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["missing-value", "negative-area", "category-typo", "missing-target"],
    estimatedMinutes: 7,
    exerciseId: "exercise-1-3-mark-first-look-issues",
    hints: [
      "A blank feature value is a missing-value issue.",
      "Negative delivery time violates the meaning of the field.",
      "Inconsistent category spelling should be flagged.",
      "A blank target is a high-priority issue for supervised learning.",
    ],
    id: "lesson-1-3-data-quality-first-look",
    moduleId: "module-1-data-understanding",
    numberLabel: "Lesson 1.3",
    objective: "You can spot first-look data quality issues before deeper analysis.",
    options: [
      { id: "missing-value", label: "A feature value is missing." },
      { id: "negative-area", label: "Delivery time is negative." },
      { id: "category-typo", label: "A traffic level label uses inconsistent spelling." },
      { id: "missing-target", label: "A target value is empty." },
      { id: "valid-district", label: "A valid traffic level value is present." },
    ],
    prompt: "Which items are first-look data quality issues?",
    summary: [
      "A dataset should not be trusted immediately. First-look checks catch missing values, impossible numbers, inconsistent formats, and duplicated records.",
      "The goal is not to fix everything instantly. The goal is to record what needs deeper investigation.",
    ],
    title: "Data Quality First Look",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["price-histogram", "area-price-scatter", "district-bar", "type-box"],
    estimatedMinutes: 6,
    exerciseId: "exercise-2-1-choose-chart-by-question",
    hints: [
      "A single numeric target distribution is read well with a histogram.",
      "Two numeric variables fit a scatter plot.",
      "Counts across traffic categories fit a bar chart.",
      "Comparing delivery-time summaries by vehicle type fits grouped summaries.",
    ],
    id: "lesson-2-1-choose-chart",
    moduleId: "module-2-eda-regression",
    numberLabel: "Lesson 3.1",
    objective: "You can choose charts based on the question and data type.",
    options: [
      { id: "price-histogram", label: "Use a histogram for the delivery-time distribution." },
      { id: "area-price-scatter", label: "Use a scatter plot for distance vs delivery time." },
      { id: "district-bar", label: "Use a bar chart for order count by traffic level." },
      { id: "type-box", label: "Use grouped summaries to compare delivery time by vehicle type." },
      { id: "id-histogram", label: "Use a histogram of order IDs to evaluate model quality." },
    ],
    prompt: "Which chart choices match the question?",
    summary: [
      "EDA charts should be chosen from the question and column types.",
      "For regression, numeric feature to numeric target relationships are often inspected with scatter plots.",
    ],
    title: "Choosing Charts by Question",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["right-skew", "wide-range"],
    estimatedMinutes: 6,
    exerciseId: "exercise-2-2-select-histogram-conclusion",
    hints: [
      "A longer right tail means a few deliveries take much longer than most.",
      "A broad range means model error should be interpreted in real units.",
    ],
    id: "lesson-2-2-read-target-distribution",
    moduleId: "module-2-eda-regression",
    numberLabel: "Lesson 3.2",
    objective: "You can read a target distribution for range, skew, and extreme values.",
    options: [
      { id: "right-skew", label: "Delivery time is right-skewed with a few slow deliveries." },
      {
        id: "wide-range",
        label: "The delivery-time range is wide enough that error units matter.",
      },
      { id: "all-same", label: "All orders have almost identical delivery times." },
      { id: "no-extreme", label: "There are no unusually slow deliveries worth checking." },
    ],
    prompt: "Which conclusions are supported by a right-skewed delivery-time histogram?",
    summary: [
      "A target histogram shows the values the model needs to predict.",
      "Skew and extreme values can make evaluation harder, but they do not automatically mean the data is wrong.",
    ],
    title: "Reading Target Distribution",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["building-area"],
    estimatedMinutes: 7,
    exerciseId: "exercise-2-3-select-promising-feature",
    hints: [
      "Choose the feature whose scatter plot rises with delivery time and has real route meaning.",
    ],
    id: "lesson-2-3-feature-target-relationship",
    moduleId: "module-2-eda-regression",
    numberLabel: "Lesson 3.3",
    objective: "You can identify a promising feature-target relationship from a scatter plot.",
    options: [
      {
        id: "building-area",
        label: "distance_km, because delivery time tends to rise for longer routes.",
      },
      { id: "listing-id", label: "order_id, because it is unique for each row." },
      { id: "random-order", label: "Random row order, because it changes every row." },
      { id: "source-batch", label: "Source batch, because it is a data collection artifact." },
    ],
    prompt: "Which feature is most promising for a first Linear Regression model?",
    summary: [
      "Scatter plots help compare numeric features against numeric targets.",
      "A roughly linear positive or negative pattern is a useful signal for a first Linear Regression model.",
    ],
    title: "Feature-Target Relationships",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["investigate-outlier", "do-not-auto-delete"],
    estimatedMinutes: 6,
    exerciseId: "exercise-2-4-mark-outlier-candidate",
    hints: [
      "Unusual distance-time combinations should be marked for investigation.",
      "Keep context before removing a point; unusual does not automatically mean invalid.",
    ],
    id: "lesson-2-4-mark-outlier-candidate",
    moduleId: "module-2-eda-regression",
    numberLabel: "Lesson 3.4",
    objective: "You can identify outlier candidates without deleting them automatically.",
    options: [
      {
        id: "investigate-outlier",
        label: "Mark unusual distance-delivery-time points for investigation.",
      },
      { id: "do-not-auto-delete", label: "Keep context before deciding to remove a point." },
      { id: "delete-all-high", label: "Delete every unusually slow delivery immediately." },
      {
        id: "ignore-outliers",
        label: "Ignore all outliers because models handle them automatically.",
      },
    ],
    prompt: "Which outlier-handling statements are correct?",
    summary: [
      "Outlier candidates are observations that stand apart from the main pattern.",
      "They should be investigated with context before deciding whether they are valid examples or data errors.",
    ],
    title: "Marking Outlier Candidates",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["supported-pattern", "state-limits", "next-step"],
    estimatedMinutes: 5,
    exerciseId: "exercise-2-5-eda-conclusion",
    hints: [
      "EDA conclusions should cite visible evidence.",
      "Avoid claims that the chart cannot support.",
      "A useful conclusion points to a next decision.",
    ],
    id: "lesson-2-5-eda-conclusion",
    moduleId: "module-2-eda-regression",
    numberLabel: "Lesson 3.5",
    objective: "You can choose EDA conclusions that are supported by evidence.",
    options: [
      { id: "supported-pattern", label: "Distance appears positively related to delivery time." },
      { id: "state-limits", label: "The chart does not prove causation." },
      { id: "next-step", label: "Investigate extreme points before cleaning or modeling." },
      { id: "perfect-model", label: "The chart proves the model will be perfect." },
    ],
    prompt: "Which statements are valid EDA conclusions?",
    summary: [
      "EDA should produce decisions or next steps, not just charts.",
      "Strong EDA conclusions are tied to evidence and do not overclaim what the visual can prove.",
    ],
    title: "EDA Conclusion",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["context-action", "missing-pattern", "avoid-auto-drop"],
    estimatedMinutes: 6,
    exerciseId: "exercise-3-1-missing-values",
    hints: [
      "The right action depends on how much is missing and where.",
      "Missingness can have a pattern.",
      "Dropping rows is not always the safest first move.",
    ],
    id: "lesson-3-1-missing-values",
    moduleId: "module-1-data-understanding",
    numberLabel: "Lesson 1.4",
    objective: "You can choose a missing-value action based on context.",
    options: [
      {
        id: "context-action",
        label: "Choose the action based on column importance and amount missing.",
      },
      { id: "missing-pattern", label: "Check whether missing values follow a pattern." },
      {
        id: "avoid-auto-drop",
        label: "Avoid automatically dropping every row with a missing value.",
      },
      { id: "fill-target", label: "Always fill missing target values with zero." },
    ],
    prompt: "Which missing-value decisions are sound?",
    summary: [
      "Missing values are common, but they do not all require the same fix.",
      "The amount, column meaning, and pattern of missingness should guide the cleaning action.",
    ],
    title: "Missing Values",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["find-duplicate", "avoid-bias"],
    estimatedMinutes: 5,
    exerciseId: "exercise-3-2-duplicate-rows",
    hints: [
      "A true duplicate repeats the same order record, not just one shared field.",
      "Repeated records can overweight examples in summaries and model training.",
    ],
    id: "lesson-3-2-duplicate-rows",
    moduleId: "module-1-data-understanding",
    numberLabel: "Lesson 1.5",
    objective: "You can identify duplicate rows and explain their impact.",
    options: [
      { id: "find-duplicate", label: "Flag rows that repeat the same order record." },
      { id: "avoid-bias", label: "Duplicates can overweight repeated examples." },
      { id: "same-district", label: "Rows with the same traffic level are always duplicates." },
      { id: "keep-all", label: "Duplicate rows never affect model evaluation." },
    ],
    prompt: "Which duplicate-row statements are correct?",
    summary: [
      "Duplicate rows can make some observations count more than they should.",
      "A duplicate decision should compare the full record and business context, not just one matching column.",
    ],
    title: "Duplicate Rows",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["negative-area", "impossible-bedroom", "valid-high-price"],
    estimatedMinutes: 6,
    exerciseId: "exercise-3-3-invalid-values",
    hints: [
      "Negative delivery time is impossible for the field.",
      "Negative courier experience is another impossible physical value.",
      "A very long delivery can be valid when route context supports it.",
    ],
    id: "lesson-3-3-invalid-values",
    moduleId: "module-1-data-understanding",
    numberLabel: "Lesson 1.6",
    objective: "You can separate valid, suspicious, and impossible values.",
    options: [
      { id: "negative-area", label: "Negative delivery time is invalid." },
      { id: "impossible-bedroom", label: "Negative courier experience is invalid." },
      {
        id: "valid-high-price",
        label: "A very long delivery time can be valid if the route context supports it.",
      },
      { id: "all-expensive-invalid", label: "Every unusually slow delivery is invalid." },
    ],
    prompt: "Which invalid-value statements are correct?",
    summary: [
      "Invalid values violate the meaning of a field, such as negative physical measurements.",
      "Suspicious values need investigation, but they are not automatically wrong.",
    ],
    title: "Invalid Values",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["use-context", "correct-error", "keep-valid"],
    estimatedMinutes: 6,
    exerciseId: "exercise-3-4-outlier-valid-or-error",
    hints: [
      "Use other fields and domain context before judging an outlier.",
      "Confirmed data errors should be corrected or removed.",
      "Rare but valid cases should stay in the dataset.",
    ],
    id: "lesson-3-4-outlier-valid-or-error",
    moduleId: "module-1-data-understanding",
    numberLabel: "Lesson 1.7",
    objective: "You can choose whether an outlier is a valid example or a data error.",
    options: [
      { id: "use-context", label: "Use other fields and domain context before deciding." },
      { id: "correct-error", label: "Correct or remove values that are confirmed data errors." },
      { id: "keep-valid", label: "Keep unusual but valid examples." },
      { id: "delete-first", label: "Delete every outlier before checking context." },
    ],
    prompt: "Which outlier decisions are safe?",
    summary: [
      "Outliers can be valid rare cases or data errors.",
      "Cleaning should preserve valid variation while correcting confirmed problems.",
    ],
    title: "Valid Outlier or Data Error",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["record-action", "record-reason", "preserve-target"],
    estimatedMinutes: 5,
    exerciseId: "exercise-3-5-cleaning-summary",
    hints: [
      "Record the exact cleaning action.",
      "Record why that action was chosen.",
      "Handle missing target values carefully instead of hiding them with arbitrary fills.",
    ],
    id: "lesson-3-5-cleaning-summary",
    moduleId: "module-1-data-understanding",
    numberLabel: "Lesson 1.8",
    objective: "You can summarize cleaning decisions with clear reasons.",
    options: [
      { id: "record-action", label: "Record the cleaning action." },
      { id: "record-reason", label: "Record the reason for the action." },
      {
        id: "preserve-target",
        label: "Treat missing target values carefully instead of filling them blindly.",
      },
      { id: "silent-changes", label: "Make silent cleaning changes so the model trains faster." },
    ],
    prompt: "Which items belong in a cleaning decision summary?",
    summary: [
      "Cleaning decisions should be traceable.",
      "A good summary states the issue, action, and reason so later evaluation can be trusted.",
    ],
    title: "Cleaning Decision Summary",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["known-before", "not-target", "not-id-only"],
    estimatedMinutes: 5,
    exerciseId: "exercise-4-1-safe-features",
    hints: [
      "A safe feature is available before prediction.",
      "The target must not be used as input.",
      "Identifiers rarely explain the outcome by themselves.",
    ],
    id: "lesson-4-1-safe-features",
    moduleId: "module-4-feature-preparation-leakage",
    numberLabel: "Lesson 5.1",
    objective: "You can choose features that are safe for prediction.",
    options: [
      { id: "known-before", label: "Use fields known before prediction time." },
      { id: "not-target", label: "Exclude the target from model inputs." },
      { id: "not-id-only", label: "Avoid treating row identifiers as meaningful signals." },
      {
        id: "use-final-price",
        label: "Use final delivery time as a feature to predict delivery time.",
      },
    ],
    prompt: "Which feature choices are safe?",
    summary: [
      "Safe features are available before prediction and do not reveal the answer.",
      "Feature selection should avoid target leakage and meaningless identifiers.",
    ],
    title: "Safe Features",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["future-info", "target-derived", "post-outcome"],
    estimatedMinutes: 6,
    exerciseId: "exercise-4-2-data-leakage",
    hints: [
      "Fields known only after the prediction point can leak the future.",
      "Values computed from the target reveal the answer indirectly.",
      "Using final delivery time to predict final delivery time is direct leakage.",
    ],
    id: "lesson-4-2-data-leakage",
    moduleId: "module-4-feature-preparation-leakage",
    numberLabel: "Lesson 5.2",
    objective: "You can identify features that leak target information.",
    options: [
      { id: "future-info", label: "Information only known after the prediction point." },
      { id: "target-derived", label: "A field calculated from the target." },
      { id: "post-outcome", label: "Final delivery time used to forecast delivery time." },
      { id: "building-area", label: "Distance known before the prediction is made." },
    ],
    prompt: "Which fields are leakage risks?",
    summary: [
      "Data leakage happens when model inputs contain information that would not be available in real prediction use.",
      "Leakage can make evaluation look impressive while failing in real use.",
    ],
    title: "Data Leakage",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["weak-binned-age", "missing-nonlinear", "needs-better-representation"],
    estimatedMinutes: 6,
    exerciseId: "exercise-4-3-weak-feature-representation",
    hints: [
      "A feature can be available but poorly represented.",
      "Linear models need useful numeric representations.",
      "A weak representation can hide a real pattern.",
    ],
    id: "lesson-4-3-weak-feature-representation",
    moduleId: "module-4-feature-preparation-leakage",
    numberLabel: "Lesson 5.3",
    objective: "You can identify when a feature representation is too weak.",
    options: [
      { id: "weak-binned-age", label: "A coarse bucket can hide useful variation." },
      { id: "missing-nonlinear", label: "A raw feature can miss a curved relationship." },
      {
        id: "needs-better-representation",
        label: "Better representation can help a simple model.",
      },
      { id: "always-drop", label: "Weakly represented features must always be dropped." },
    ],
    prompt: "Which statements about weak feature representation are correct?",
    summary: [
      "A feature can be safe but still not represented in a useful way.",
      "Simple models often benefit when raw fields are transformed into clearer signals.",
    ],
    title: "Weak Feature Representation",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["area-per-bedroom", "is-central", "row-wise-safe"],
    estimatedMinutes: 6,
    exerciseId: "exercise-4-4-safe-feature-engineering",
    hints: [
      "Derived route or traffic flags can be safe when built from existing input fields.",
      "Traffic-level indicators are safe if traffic is known before prediction.",
      "Row-wise transformations avoid using other rows or the target.",
    ],
    id: "lesson-4-4-safe-feature-engineering",
    moduleId: "module-4-feature-preparation-leakage",
    numberLabel: "Lesson 5.4",
    objective: "You can identify simple safe feature engineering ideas.",
    options: [
      {
        id: "area-per-bedroom",
        label: "Create a long-route-and-high-traffic flag from existing delivery fields.",
      },
      { id: "is-central", label: "Create a high-traffic flag from traffic level." },
      { id: "row-wise-safe", label: "Use row-wise transformations that do not use the target." },
      { id: "price-ratio", label: "Create a feature directly from delivery_time_min." },
    ],
    prompt: "Which feature engineering ideas are safe?",
    summary: [
      "Feature engineering can create clearer signals from existing safe fields.",
      "Row-wise transformations are safer than transformations that learn from the whole dataset or target.",
    ],
    title: "Simple Feature Engineering",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["use-hypothesis", "avoid-random-id", "compare-evidence"],
    estimatedMinutes: 5,
    exerciseId: "exercise-4-5-avoid-irrelevant-features",
    hints: [
      "A new feature should come from a plausible model hypothesis.",
      "Random IDs should not be treated as predictive meaning.",
      "A feature earns its place by improving held-out evaluation.",
    ],
    id: "lesson-4-5-avoid-irrelevant-features",
    moduleId: "module-4-feature-preparation-leakage",
    numberLabel: "Lesson 5.5",
    objective: "You can avoid adding irrelevant features without evidence.",
    options: [
      { id: "use-hypothesis", label: "Add features based on a plausible hypothesis." },
      { id: "avoid-random-id", label: "Avoid random identifiers as predictive features." },
      { id: "compare-evidence", label: "Compare whether a new feature improves evaluation." },
      { id: "add-everything", label: "Add every available column because more is always better." },
    ],
    prompt: "Which feature-selection habits are sound?",
    summary: [
      "Adding features can help, but irrelevant features add noise and complexity.",
      "A new feature should be motivated and then checked against evaluation evidence.",
    ],
    title: "Avoid Irrelevant Features",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["estimate-generalization", "holdout-data", "avoid-training-only"],
    estimatedMinutes: 5,
    exerciseId: "exercise-5-1-why-train-test-split",
    hints: [
      "The goal is estimating behavior on data the model has not seen.",
      "A holdout set is reserved for evaluation.",
      "Training-only scores are too easy to overtrust.",
    ],
    id: "lesson-5-1-why-train-test-split",
    moduleId: "module-5-split-baseline",
    numberLabel: "Lesson 6.1",
    objective: "You can explain why train/test split is needed.",
    options: [
      { id: "estimate-generalization", label: "Estimate how the model behaves on unseen data." },
      { id: "holdout-data", label: "Keep a holdout set for evaluation." },
      { id: "avoid-training-only", label: "Avoid judging a model only on training data." },
      { id: "make-data-bigger", label: "Split data to create more rows than before." },
    ],
    prompt: "Why do we use a train/test split?",
    summary: [
      "A model can look good on data it already saw.",
      "Train/test split gives a more honest check of performance on unseen examples.",
    ],
    title: "Why Train/Test Split Matters",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["split-first", "fit-on-train", "apply-to-test"],
    estimatedMinutes: 6,
    exerciseId: "exercise-5-2-split-before-distribution-transform",
    hints: [
      "Split before fitting any transformation that learns dataset statistics.",
      "Learn preprocessing settings from training data only.",
      "Apply learned settings to test data without refitting.",
    ],
    id: "lesson-5-2-split-before-distribution-transform",
    moduleId: "module-5-split-baseline",
    numberLabel: "Lesson 6.2",
    objective: "You can place train/test split before distribution-based transforms.",
    options: [
      {
        id: "split-first",
        label: "Split data before fitting transformations that learn statistics.",
      },
      { id: "fit-on-train", label: "Fit distribution-based transformations on training data." },
      { id: "apply-to-test", label: "Apply the learned transformation to test data." },
      { id: "fit-on-all", label: "Fit preprocessing on all data before split." },
    ],
    prompt: "Which preprocessing order avoids leakage?",
    summary: [
      "Some transformations learn from data distribution.",
      "To avoid leakage, those transformations should be fitted on train data and then applied to test data.",
    ],
    title: "Split Before Distribution-Based Transformations",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["mean-baseline", "compare-model", "simple-reference"],
    estimatedMinutes: 5,
    exerciseId: "exercise-5-3-mean-baseline",
    hints: [
      "For regression, predicting the training target mean is a common baseline.",
      "A model needs to be compared against that simple reference.",
      "The baseline is a benchmark, not the final modeling goal.",
    ],
    id: "lesson-5-3-mean-baseline",
    moduleId: "module-5-split-baseline",
    numberLabel: "Lesson 6.3",
    objective: "You can explain and use a simple mean baseline for regression.",
    options: [
      { id: "mean-baseline", label: "Predict the training target mean as a baseline." },
      { id: "compare-model", label: "Compare the model against the baseline." },
      {
        id: "simple-reference",
        label: "Use the baseline as a simple reference, not the final goal.",
      },
      { id: "baseline-test-mean", label: "Use the test target mean as the prediction rule." },
    ],
    prompt: "Which baseline statements are correct?",
    summary: [
      "A baseline is a simple prediction rule used as a reference.",
      "For regression, predicting the training target mean helps judge whether a model adds value.",
    ],
    title: "Mean Baseline",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["similar-distribution", "avoid-sorted-split", "check-target-range"],
    estimatedMinutes: 6,
    exerciseId: "exercise-5-4-representative-split",
    hints: [
      "Train and test should cover broadly similar target behavior.",
      "Sorting by target before splitting can create biased sets.",
      "Check that both sets include realistic delivery-time ranges.",
    ],
    id: "lesson-5-4-representative-split",
    moduleId: "module-5-split-baseline",
    numberLabel: "Lesson 6.4",
    objective: "You can identify whether a split is representative enough for evaluation.",
    options: [
      {
        id: "similar-distribution",
        label: "Train and test should have broadly similar target coverage.",
      },
      { id: "avoid-sorted-split", label: "Avoid splitting after sorting by target." },
      {
        id: "check-target-range",
        label: "Check whether both sets cover realistic delivery-time ranges.",
      },
      {
        id: "test-only-cheap",
        label: "Put only short deliveries in test to make evaluation easier.",
      },
    ],
    prompt: "Which split practices support reliable evaluation?",
    summary: [
      "A test set should represent the kind of data the model will face.",
      "A split that separates data by sorted delivery time or unusual groups can distort evaluation.",
    ],
    title: "Representative Split",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["line-pattern", "minimize-error", "simple-start"],
    estimatedMinutes: 6,
    exerciseId: "exercise-6-1-fit-a-line",
    hints: [
      "Linear Regression fits a straight-line relationship.",
      "The fitted line is chosen to reduce prediction errors.",
      "It is a useful first model when the visual pattern is roughly linear.",
    ],
    id: "lesson-6-1-fit-a-line",
    moduleId: "module-2-eda-regression",
    numberLabel: "Lesson 3.6",
    objective: "You can explain what Linear Regression fits.",
    options: [
      { id: "line-pattern", label: "It fits a straight-line pattern between feature and target." },
      { id: "minimize-error", label: "It chooses a line that reduces prediction errors." },
      { id: "simple-start", label: "It is a simple first model for roughly linear patterns." },
      { id: "perfect-nonlinear", label: "It perfectly captures every non-linear pattern." },
    ],
    prompt: "Which statements describe Linear Regression?",
    summary: [
      "Linear Regression fits a straight-line relationship between input features and a numeric target.",
      "It is a simple first model that is easiest to reason about when the data pattern is roughly linear.",
    ],
    title: "Fit a Line",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["plug-feature", "read-output", "same-unit"],
    estimatedMinutes: 5,
    exerciseId: "exercise-6-2-linear-prediction",
    hints: [
      "Use feature values as inputs for the model.",
      "The output is the predicted target value.",
      "Read regression output in the target unit.",
    ],
    id: "lesson-6-2-linear-prediction",
    moduleId: "module-2-eda-regression",
    numberLabel: "Lesson 3.7",
    objective: "You can interpret a numeric prediction from a regression model.",
    options: [
      { id: "plug-feature", label: "Use feature values as inputs to produce a prediction." },
      { id: "read-output", label: "Read the output as the predicted delivery time." },
      { id: "same-unit", label: "Interpret the prediction in the target unit." },
      { id: "class-label", label: "Interpret the prediction as a vehicle-type class." },
    ],
    prompt: "Which prediction statements are correct?",
    summary: [
      "A regression model prediction is a numeric output for a row.",
      "The prediction should be interpreted in the same unit as the target, such as minutes.",
    ],
    title: "Prediction",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["actual-minus-predicted", "direction-matters", "large-residual"],
    estimatedMinutes: 5,
    exerciseId: "exercise-6-3-residual",
    hints: [
      "Residual is computed by comparing actual and predicted values.",
      "The sign tells whether the model overpredicts or underpredicts.",
      "Large magnitudes identify examples where the model misses badly.",
    ],
    id: "lesson-6-3-residual",
    moduleId: "module-2-eda-regression",
    numberLabel: "Lesson 3.8",
    objective: "You can read a residual as prediction error for one example.",
    options: [
      { id: "actual-minus-predicted", label: "Residual is actual value minus predicted value." },
      { id: "direction-matters", label: "Residual sign shows overprediction or underprediction." },
      { id: "large-residual", label: "Large residual magnitude marks a difficult example." },
      { id: "always-positive", label: "Residuals are always positive." },
    ],
    prompt: "Which residual statements are correct?",
    summary: [
      "A residual is the difference between actual target and prediction for one row.",
      "Residuals help identify where the model is overpredicting, underpredicting, or making large errors.",
    ],
    title: "Residual",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["mae-unit", "rmse-penalty", "compare-baseline"],
    estimatedMinutes: 6,
    exerciseId: "exercise-6-4-error-metrics",
    hints: [
      "MAE is easy to read in target units.",
      "RMSE penalizes larger errors more strongly.",
      "Metrics need comparison context.",
    ],
    id: "lesson-6-4-error-metrics",
    moduleId: "module-2-eda-regression",
    numberLabel: "Lesson 3.9",
    objective: "You can interpret basic regression error metrics.",
    options: [
      { id: "mae-unit", label: "MAE is read in the same unit as the target." },
      { id: "rmse-penalty", label: "RMSE reacts more strongly to large errors." },
      { id: "compare-baseline", label: "Metrics should be compared with a baseline." },
      { id: "accuracy", label: "Classification accuracy is the main regression metric." },
    ],
    prompt: "Which metric statements are correct?",
    summary: [
      "Regression metrics summarize prediction error across examples.",
      "MAE is easy to interpret in target units, while RMSE gives extra weight to larger errors.",
    ],
    title: "Error Metrics",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["patterned-residuals", "weak-representation", "model-too-simple"],
    estimatedMinutes: 6,
    exerciseId: "exercise-6-5-diagnose-underfitting",
    hints: [
      "Patterned residuals suggest structure is still missed.",
      "Weak feature representation can limit the model.",
      "A too-simple model may miss the real relationship.",
    ],
    id: "lesson-6-5-diagnose-underfitting",
    moduleId: "module-5-split-baseline",
    numberLabel: "Lesson 6.5",
    objective: "You can diagnose underfitting from model evidence.",
    options: [
      { id: "patterned-residuals", label: "Residuals show a systematic pattern." },
      {
        id: "weak-representation",
        label: "The current feature representation misses useful structure.",
      },
      { id: "model-too-simple", label: "The model may be too simple for the relationship." },
      { id: "perfect-fit", label: "The model has zero error on all examples." },
    ],
    prompt: "Which signals can indicate underfitting?",
    summary: [
      "Underfitting happens when the model is too simple or features are too weak to capture important patterns.",
      "Residual patterns and weak improvement over baseline can reveal the issue.",
    ],
    title: "Diagnose Underfitting",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["add-safe-feature", "retrain-model", "reevaluate-model"],
    estimatedMinutes: 7,
    exerciseId: "exercise-6-6-retrain-with-feature-engineering",
    hints: [
      "Add only safe engineered features supported by evidence.",
      "Changing inputs requires training a new model.",
      "The changed model must be checked again on held-out data.",
    ],
    id: "lesson-6-6-retrain-with-feature-engineering",
    moduleId: "module-5-split-baseline",
    numberLabel: "Lesson 6.6",
    objective: "You can connect feature engineering with retraining and reevaluation.",
    options: [
      { id: "add-safe-feature", label: "Add a safe engineered feature based on evidence." },
      { id: "retrain-model", label: "Retrain the model with the new feature set." },
      { id: "reevaluate-model", label: "Evaluate again on the held-out test set." },
      {
        id: "no-retrain",
        label: "Keep the old model and expect it to use the new feature automatically.",
      },
    ],
    prompt: "What must happen after adding a useful engineered feature?",
    summary: [
      "Feature engineering changes the model inputs.",
      "After changing inputs, the model must be trained again and evaluated again to know whether the change helped.",
    ],
    title: "Retrain with Feature Engineering",
  }),
  multipleChoiceLesson({
    correctOptionIds: ["compare-baseline-models", "state-evidence", "state-limitations"],
    estimatedMinutes: 6,
    exerciseId: "exercise-6-7-model-conclusion",
    hints: [
      "Compare baseline, first model, and improved model rather than one number alone.",
      "Use metric and residual evidence in the conclusion.",
      "State limitations so the result is not oversold.",
    ],
    id: "lesson-6-7-model-conclusion",
    moduleId: "module-9-closing",
    numberLabel: "Lesson 8.1",
    objective: "You can choose a model conclusion supported by evaluation evidence.",
    options: [
      {
        id: "compare-baseline-models",
        label: "Compare baseline, first model, and improved model.",
      },
      { id: "state-evidence", label: "Use metric and residual evidence in the conclusion." },
      { id: "state-limitations", label: "State where the model is still limited." },
      {
        id: "claim-perfect",
        label: "Claim the model is production-ready because it beat baseline once.",
      },
    ],
    prompt: "Which statements belong in a responsible model conclusion?",
    summary: [
      "A model conclusion should be tied to evidence from metrics and residuals.",
      "It should compare against baseline, mention improvements, and state remaining limitations.",
    ],
    title: "Model Conclusion",
  }),
];

export const lessons: Lesson[] = [
  lesson01,
  lesson02,
  lesson03,
  lesson04,
  lesson05,
  lesson06,
  ...laterLessons,
];

export const activeLesson = lessons[0];

export function getLesson(lessonId: string) {
  return lessons.find((lesson) => lesson.id === lessonId);
}

export function getModule(moduleId: string) {
  return learningModules.find((module) => module.id === moduleId);
}

export function getTrack(trackId: string) {
  return learningTracks.find((track) => track.id === trackId);
}
