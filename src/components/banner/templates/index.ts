import type { BannerTemplate, TemplateFactory } from '../../../types';
import { photoEditorial } from './photoEditorial';
import { photoSplit } from './photoSplit';
import { photoDuotone } from './photoDuotone';
import { photoFrosted } from './photoFrosted';
import { photoVignette } from './photoVignette';
import { photoStripe } from './photoStripe';

export const TEMPLATES: TemplateFactory[] = [
  photoEditorial,
  photoDuotone,
  photoFrosted,
  photoVignette,
  photoSplit,
  photoStripe,
];

export const TEMPLATE_COUNT = TEMPLATES.length;

export function getTemplate(variant: number, roomColor: string, accentColor: string): BannerTemplate {
  const factory = TEMPLATES[variant % TEMPLATES.length];
  return factory(roomColor, accentColor);
}

/** All templates now use photos - always returns true. */
export function isPhotoTemplate(_variant: number): boolean {
  return true;
}
