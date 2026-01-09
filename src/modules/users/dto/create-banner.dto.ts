import { BannerType } from "@prisma/client";

export class CreateBannerDto {
  title: string;
  description?: string;
  imageDesktop: string;
  imageMobile: string;
  type?: BannerType;
  ctaText?: string;
  ctaLink?: string;
  showButton?: boolean;
  openInNewTab?: boolean;
  order?: number;
  startDate?: Date;
  endDate?: Date;
}
