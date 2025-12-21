export interface PricingPlan {
    name: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    buttonText: string;
    buttonVariant: "hero" | "secondary" | "outline";
    popular: boolean;
    badge?: string;
}

export const PRICING_PLANS: PricingPlan[] = [
    {
        name: "Free",
        price: "$0",
        period: "month",
        description: "Get started for free",
        features: [
            "5 credits per month",
            "Brand scanning (1 credit)",
            "AI chat & strategy (1 credit)",
            "Watermarked exports",
        ],
        buttonText: "Start Free",
        buttonVariant: "secondary",
        popular: false,
    },
    {
        name: "Credit Pack",
        price: "$19",
        period: "50 credits",
        description: "Pay as you go",
        features: [
            "50 AI credits",
            "Never expires",
            "All AI features",
            "Unwatermarked exports",
            "Commercial license",
        ],
        buttonText: "Buy 50 Credits",
        buttonVariant: "hero",
        popular: true,
        badge: "Best Value",
    },
    {
        name: "Pro",
        price: "$49",
        period: "month",
        description: "For power users",
        features: [
            "200 credits per month",
            "Priority AI generation",
            "Unlimited brand profiles",
            "Direct ad network sync",
        ],
        buttonText: "Subscribe",
        buttonVariant: "outline",
        popular: false,
    },
];
