// Planos de assinatura e limites mensais.
// O custo que importa é a IA: cada "geração" é uma chamada à API (criar ou
// ajustar um vídeo). Renderizações gastam só CPU do servidor.

export type PlanId = "gratis" | "criador" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  priceLabel: string;
  videosPerMonth: number;
  aiGenerationsPerMonth: number;
  watermark: boolean;
  highlights: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  gratis: {
    id: "gratis",
    name: "Grátis",
    priceLabel: "R$ 0",
    videosPerMonth: 3,
    aiGenerationsPerMonth: 5,
    watermark: true,
    highlights: ["3 vídeos por mês", "5 gerações com IA", "Marca d'água no vídeo"],
  },
  criador: {
    id: "criador",
    name: "Criador",
    priceLabel: "R$ 47/mês",
    videosPerMonth: 30,
    aiGenerationsPerMonth: 90,
    watermark: false,
    highlights: ["30 vídeos por mês", "90 gerações/ajustes com IA", "Sem marca d'água"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "R$ 97/mês",
    videosPerMonth: 70,
    aiGenerationsPerMonth: 210,
    watermark: false,
    highlights: ["70 vídeos por mês", "210 gerações/ajustes com IA", "Sem marca d'água", "Prioridade na renderização"],
  },
};

export function getPlan(id: string | undefined): Plan {
  return PLANS[(id as PlanId) ?? "gratis"] ?? PLANS.gratis;
}
