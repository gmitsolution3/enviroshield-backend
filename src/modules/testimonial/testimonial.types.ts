export type TTestimonialStatus = "draft" | "published";

export type TTestimonialImage = {
  url: string;
  alt: string;
};

export type TTestimonial = {
  clientName: string;
  clientImage?: TTestimonialImage;
  rating: number;
  content: string;
  status: TTestimonialStatus;
};
