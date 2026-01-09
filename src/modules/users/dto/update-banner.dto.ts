import { CreateBannerDto } from "./create-banner.dto";

export class UpdateBannerDto extends CreateBannerDto {
  isActive?: boolean;
}