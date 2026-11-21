export type ReviewSummary = {
  average_rating: number;
  total_reviews: number;
};

export type UploadedImageInput = {
  mimeType: string;
  fileBuffer: ArrayBuffer;
};
