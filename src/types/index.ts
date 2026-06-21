export interface User {
  id: string;
  email: string;
  anonymousId: string;
  isSeller: boolean;
  isFirstPurchase: boolean;
  createdAt: string;
}

export interface VerifiedGrade {
  id: string;
  userId: string;
  courseCode: string;
  courseName: string;
  grade: string;
  academicYear: string;
  semester: string;
  status: "pending_review" | "verified" | "rejected";
}

export interface Note {
  id: string;
  sellerId: string;
  verifiedGradeId: string;
  title: string;
  description: string;
  priceCents: number;
  language: string;
  pdfUrl: string;
  previewImageUrls: string[];
  pageCount: number;
  status: "draft" | "pending_review" | "published" | "needs_revision";
  salesCount: number;
  publishedAt: string;
  createdAt: string;
}
