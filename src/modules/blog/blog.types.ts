export type TBlogStatus = "draft" | "published";

export type TBlogImage = {
  url: string;
  alt: string;
  caption?: string;
};

export type TBlogSEO = {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  noIndex?: boolean;
};

export type TBlog = {
  title: string;
  slug: string;
  excerpt: string;
  content: Record<string, unknown>;

  coverImage: TBlogImage;

  tags: string[];

  authorId: string;

  status: TBlogStatus;
  publishedAt?: Date | null;

  seo?: TBlogSEO;
};