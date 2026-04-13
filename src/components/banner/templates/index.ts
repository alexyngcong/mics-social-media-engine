import type { BannerTemplate, TemplateFactory } from '../../../types';
import { classicDark } from './classicDark';
import { accentGlow } from './accentGlow';
import { centeredRadial } from './centeredRadial';
import { tripleOrb } from './tripleOrb';
import { leftBarAccent } from './leftBarAccent';
import { conicGlow } from './conicGlow';

export const TEMPLATES: TemplateFactory[] = [
  classicDark,
  accentGlow,
  centeredRadial,
  tripleOrb,
  leftBarAccent,
  conicGlow,
];

export const TEMPLATE_COUNT = TEMPLATES.length;

export function getTemplate(variant: number, roomColor: string, accentColor: string): BannerTemplate {
  const factory = TEMPLATES[variant % TEMPLATES.length];
  return factory(roomColor, accentColor);
}
