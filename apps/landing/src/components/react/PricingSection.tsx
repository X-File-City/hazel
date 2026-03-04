import { siteConfig } from "@/lib/config"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Check } from "lucide-react"

export function PricingSection() {
	const [isYearly, setIsYearly] = useState(false)
	const { pricing } = siteConfig

	return (
		<section
			id="pricing"
			className="flex flex-col items-center justify-center gap-10 pb-20 pt-10 px-6 md:px-0 w-full"
		>
			<div className="flex flex-col items-center gap-3">
				<div className="flex items-center gap-3">
					<span
						className={cn(
							"text-sm transition-colors",
							!isYearly ? "text-primary" : "text-muted-foreground",
						)}
					>
						Monthly
					</span>
					<button
						type="button"
						onClick={() => setIsYearly(!isYearly)}
						className={cn(
							"relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
							isYearly ? "bg-secondary" : "bg-muted",
						)}
					>
						<span
							className={cn(
								"pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
								isYearly ? "translate-x-5" : "translate-x-0",
							)}
						/>
					</button>
					<span
						className={cn(
							"text-sm transition-colors",
							isYearly ? "text-primary" : "text-muted-foreground",
						)}
					>
						Yearly <span className="text-green-500 text-xs">(Save 20%)</span>
					</span>
				</div>
				<h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-primary">
					{pricing.title}
				</h2>
				<p className="text-muted-foreground text-center max-w-xl">{pricing.description}</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
				{pricing.pricingItems.map((item) => (
					<div
						key={item.name}
						className={cn(
							"relative flex flex-col p-6 bg-background rounded-2xl border border-border",
							item.isPopular && "ring-2 ring-secondary",
						)}
					>
						{item.isPopular && (
							<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-medium">
								Most Popular
							</div>
						)}
						<div className="mb-4">
							<h3 className="text-lg font-semibold text-primary">{item.name}</h3>
							<p className="text-sm text-muted-foreground">{item.description}</p>
						</div>
						<div className="mb-6">
							<span className="text-4xl font-bold text-primary">
								{isYearly ? item.yearlyPrice : item.price}
							</span>
							<span className="text-muted-foreground">/{isYearly ? "year" : item.period}</span>
						</div>
						<ul className="space-y-3 mb-6 flex-grow">
							{item.features.map((feature) => (
								<li
									key={feature}
									className="flex items-center gap-2 text-sm text-muted-foreground"
								>
									<Check className="size-4 text-green-500 shrink-0" />
									{feature}
								</li>
							))}
						</ul>
						<a
							href={item.href}
							className={cn(
								"w-full h-10 flex items-center justify-center rounded-full text-sm font-medium transition-colors",
								item.buttonColor,
							)}
						>
							{item.buttonText}
						</a>
					</div>
				))}
			</div>
		</section>
	)
}
